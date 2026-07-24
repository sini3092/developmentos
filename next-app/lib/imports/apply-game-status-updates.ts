import type { SupabaseClient } from "@supabase/supabase-js"

import type { BoardKey } from "@/lib/constants/board-keys"
import type { Database, TaskStatus } from "@/lib/database.types"
import { parseGameStatusCheckboxes, textsLikelyMatch } from "@/lib/imports/game-status-parser"
import {
  resolveListColor,
  resolveListForStatus,
  resolveStatusFromList,
} from "@/lib/imports/list-workflow"
import { normalizeTaskTitle } from "@/lib/imports/task-dedup"

type Client = SupabaseClient<Database>

export type GameStatusApplyResult = {
  tasksUpdated: number
  checklistsUpdated: number
  listMoves: number
  applied: Array<{
    identifier: string
    title: string
    status?: TaskStatus
    listName?: string
    checklistChanges?: number
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

type ListRow = {
  id: string
  name: string
  board_key: string | null
}

const DONE_MARKER = "Playable in current build"

export async function applyGameStatusMarkdownUpdates(
  supabase: Client,
  input: {
    projectId: string
    markdown: string
    explicitTaskUpdates?: Array<{
      title: string
      status?: TaskStatus
      note?: string
    }>
  }
): Promise<GameStatusApplyResult> {
  const checkboxes = parseGameStatusCheckboxes(input.markdown)

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
    applied: [],
  }

  const taskRows = (tasks ?? []) as TaskRow[]

  for (const task of taskRows) {
    const related = checkboxes.filter((item) => textsLikelyMatch(item.text, task.title))
    if (related.length === 0) {
      continue
    }

    const doneCount = related.filter((item) => item.state === "done").length
    const partialCount = related.filter((item) => item.state === "partial").length
    const nextStatus: TaskStatus =
      doneCount > 0 && partialCount === 0
        ? "done"
        : partialCount > 0 || doneCount > 0
          ? "in_progress"
          : task.status

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

    const { data: checklistItems } = await supabase
      .from("task_checklist_items")
      .select("id, title, completed")
      .eq("task_id", task.id)

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
      result.checklistsUpdated += 1
    }

    if (changed || checklistChanges > 0) {
      result.applied.push({
        identifier: task.identifier,
        title: task.title,
        status: patch.status,
        listName,
        checklistChanges,
      })
    }
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
