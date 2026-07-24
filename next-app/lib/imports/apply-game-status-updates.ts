import type { SupabaseClient } from "@supabase/supabase-js"

import type { BoardKey } from "@/lib/constants/board-keys"
import type { Database, TaskStatus } from "@/lib/database.types"
import {
  parseGameStatusDocument,
  type GameStatusCheckbox,
  textsLikelyMatch,
} from "@/lib/imports/game-status-parser"
import {
  resolveListColor,
  resolveListForStatus,
  resolveStatusFromList,
} from "@/lib/imports/list-workflow"
import { normalizeTaskTitle } from "@/lib/imports/task-dedup"
import {
  addTaskCommentIfMissing,
  resolveProjectCommentAuthor,
} from "@/lib/tasks/souls-board-helpers"

type Client = SupabaseClient<Database>

export type GameStatusApplyResult = {
  tasksUpdated: number
  checklistsUpdated: number
  listMoves: number
  commentsAdded: number
  applied: Array<{
    identifier: string
    title: string
    status?: TaskStatus
    listName?: string
    checklistChanges?: number
    commentChanges?: number
    note?: string
  }>
}

type TaskRow = {
  id: string
  identifier: string
  title: string
  status: TaskStatus
  list_id: string | null
}

const DONE_MARKER = "Playable in current build"

function resolveStatusFromCheckboxes(
  related: GameStatusCheckbox[],
  current: TaskStatus
): TaskStatus {
  const doneCount = related.filter((item) => item.state === "done").length
  const partialCount = related.filter((item) => item.state === "partial").length

  if (doneCount > 0 && partialCount === 0 && related.every((item) => item.state === "done")) {
    return "done"
  }
  if (partialCount > 0 || doneCount > 0) {
    return "in_progress"
  }
  return current
}

async function syncTaskChecklistItems(
  supabase: Client,
  taskId: string,
  related: GameStatusCheckbox[]
) {
  const { data: checklistItems } = await supabase
    .from("task_checklist_items")
    .select("id, title, completed")
    .eq("task_id", taskId)

  let checklistChanges = 0
  for (const item of checklistItems ?? []) {
    const match = related.find((checkbox) => textsLikelyMatch(checkbox.text, item.title))
    if (!match) {
      continue
    }

    const shouldComplete = match.state === "done"
    if (item.completed === shouldComplete) {
      continue
    }

    await supabase
      .from("task_checklist_items")
      .update({
        completed: shouldComplete,
        completed_at: shouldComplete ? new Date().toISOString() : null,
      })
      .eq("id", item.id)

    checklistChanges += 1
  }

  return checklistChanges
}

export async function applyGameStatusMarkdownUpdates(
  supabase: Client,
  input: {
    projectId: string
    markdown: string
    commentAuthorId?: string | null
    explicitTaskUpdates?: Array<{
      title: string
      status?: TaskStatus
      note?: string
    }>
  }
): Promise<GameStatusApplyResult> {
  const document = parseGameStatusDocument(input.markdown)
  const commentAuthorId =
    input.commentAuthorId ?? (await resolveProjectCommentAuthor(supabase, input.projectId))

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, identifier, title, status, list_id")
    .eq("project_id", input.projectId)
    .is("deleted_at", null)

  const { data: lists } = await supabase
    .from("board_lists")
    .select("id, name, board_key")
    .eq("project_id", input.projectId)

  const devListByName = new Map(
    (lists ?? [])
      .filter((list) => list.board_key === "dev")
      .map((list) => [list.name, list])
  )

  const result: GameStatusApplyResult = {
    tasksUpdated: 0,
    checklistsUpdated: 0,
    listMoves: 0,
    commentsAdded: 0,
    applied: [],
  }

  const taskRows = (tasks ?? []) as TaskRow[]
  const handledTaskIds = new Set<string>()

  async function applySnapshot(
    task: TaskRow,
    related: GameStatusCheckbox[],
    comments: string[],
    note?: string
  ) {
    handledTaskIds.add(task.id)

    const nextStatus = resolveStatusFromCheckboxes(related, task.status)
    const patch: Database["public"]["Tables"]["tasks"]["Update"] = {
      updated_at: new Date().toISOString(),
    }
    let listName: string | undefined
    let changed = false

    if (nextStatus !== task.status) {
      patch.status = nextStatus
      changed = true
    }

    const targetListName = resolveListForStatus("dev", nextStatus)
    if (targetListName) {
      const targetList = devListByName.get(targetListName)
      if (targetList && task.list_id !== targetList.id) {
        patch.list_id = targetList.id
        listName = targetListName
        result.listMoves += 1
        changed = true
      }
    }

    if (changed) {
      await supabase.from("tasks").update(patch).eq("id", task.id)
      result.tasksUpdated += 1
    }

    const checklistChanges = await syncTaskChecklistItems(supabase, task.id, related)
    result.checklistsUpdated += checklistChanges

    let commentChanges = 0
    if (commentAuthorId) {
      for (const comment of comments) {
        const added = await addTaskCommentIfMissing(supabase, {
          taskId: task.id,
          authorId: commentAuthorId,
          body: comment,
          sourceLabel: "GAME_STATUS.md",
        })
        if (added.added) {
          commentChanges += 1
          result.commentsAdded += 1
        }
      }
    }

    if (changed || checklistChanges > 0 || commentChanges > 0) {
      result.applied.push({
        identifier: task.identifier,
        title: task.title,
        status: patch.status,
        listName,
        checklistChanges,
        commentChanges,
        note,
      })
    }
  }

  for (const section of document.sections) {
    const task = taskRows.find((row) => textsLikelyMatch(section.title, row.title))
    if (!task) {
      continue
    }

    await applySnapshot(task, section.checkboxes, section.comments)
  }

  for (const task of taskRows) {
    if (handledTaskIds.has(task.id)) {
      continue
    }

    const related = document.orphanCheckboxes.filter((item) => textsLikelyMatch(item.text, task.title))
    if (related.length === 0) {
      continue
    }

    await applySnapshot(task, related, [])
  }

  for (const task of taskRows) {
    if (handledTaskIds.has(task.id)) {
      continue
    }

    const related = document.sections
      .flatMap((section) => section.checkboxes)
      .filter((item) => textsLikelyMatch(item.text, task.title))

    if (related.length === 0) {
      continue
    }

    await applySnapshot(task, related, [])
  }

  for (const update of input.explicitTaskUpdates ?? []) {
    const task = taskRows.find(
      (row) => normalizeTaskTitle(row.title) === normalizeTaskTitle(update.title)
    )
    if (!task || !update.status || task.status === update.status) {
      continue
    }

    const patch: Database["public"]["Tables"]["tasks"]["Update"] = {
      status: update.status,
      updated_at: new Date().toISOString(),
    }

    const targetListName = resolveListForStatus("dev", update.status)
    let listName: string | undefined
    if (targetListName) {
      const targetList = devListByName.get(targetListName)
      if (targetList && task.list_id !== targetList.id) {
        patch.list_id = targetList.id
        listName = targetListName
        result.listMoves += 1
      }
    }

    await supabase.from("tasks").update(patch).eq("id", task.id)
    result.tasksUpdated += 1
    result.applied.push({
      identifier: task.identifier,
      title: task.title,
      status: update.status,
      listName,
      note: update.note,
    })
  }

  return result
}

export async function repairProjectBoardWorkflow(supabase: Client, projectId: string) {
  const { data: lists } = await supabase
    .from("board_lists")
    .select("id, name, board_key, color")
    .eq("project_id", projectId)

  let listsUpdated = 0
  for (const list of lists ?? []) {
    const color = resolveListColor(list.board_key as BoardKey | null, list.name)
    if (list.color !== color) {
      await supabase.from("board_lists").update({ color }).eq("id", list.id)
      listsUpdated += 1
    }
  }

  const listById = new Map((lists ?? []).map((list) => [list.id, list]))

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, list_id")
    .eq("project_id", projectId)
    .is("deleted_at", null)

  let statusesFixed = 0
  let checklistsFixed = 0

  for (const task of tasks ?? []) {
    const list = task.list_id ? listById.get(task.list_id) : null
    const nextStatus = resolveStatusFromList(
      list?.board_key as BoardKey | null,
      list?.name ?? "",
      task.status as TaskStatus
    )

    if (nextStatus !== task.status) {
      await supabase
        .from("tasks")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", task.id)
      statusesFixed += 1
    }

    if (task.status === "done" || nextStatus === "done") {
      checklistsFixed += await ensureDoneMarkerChecklist(supabase, task.id)
    }
  }

  return { listsUpdated, statusesFixed, checklistsFixed }
}

async function ensureDoneMarkerChecklist(supabase: Client, taskId: string) {
  const { data: existing } = await supabase
    .from("task_checklist_items")
    .select("id, title, completed")
    .eq("task_id", taskId)

  const marker = (existing ?? []).find(
    (item) => item.title.trim().toLowerCase() === DONE_MARKER.toLowerCase()
  )

  if (marker) {
    if (marker.completed) {
      return 0
    }
    await supabase
      .from("task_checklist_items")
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq("id", marker.id)
    return 1
  }

  const position = existing?.length ?? 0
  await supabase.from("task_checklist_items").insert({
    task_id: taskId,
    title: DONE_MARKER,
    position,
    completed: true,
    completed_at: new Date().toISOString(),
  })
  return 1
}
