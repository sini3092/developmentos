import type { SupabaseClient } from "@supabase/supabase-js"

import type { BoardKey } from "@/lib/constants/board-keys"
import type { Database, TaskStatus } from "@/lib/database.types"
import { ensureProjectBoardList, upsertPlanTaskCard } from "@/lib/imports/board-plan-importer"
import type { PlanChecklistItem } from "@/lib/imports/everwood-plan-data"
import {
  getSyncableSections,
  isGameStatusSystemCategory,
  parseGameStatusDocument,
  type GameStatusCheckbox,
  type GameStatusSection,
  textsLikelyMatch,
} from "@/lib/imports/game-status-parser"
import {
  resolveListColor,
  resolveListForStatus,
  resolveStatusFromList,
} from "@/lib/imports/list-workflow"
import { findTaskByTitleFuzzy, normalizeTaskTitle } from "@/lib/imports/task-dedup"
import {
  addTaskCommentIfMissing,
  resolveProjectCommentAuthor,
} from "@/lib/tasks/souls-board-helpers"

type Client = SupabaseClient<Database>

export type GameStatusApplyResult = {
  tasksUpdated: number
  tasksCreated: number
  checklistsUpdated: number
  checklistsAdded: number
  listMoves: number
  listsCreated: number
  commentsAdded: number
  applied: Array<{
    identifier: string
    title: string
    status?: TaskStatus
    listName?: string
    checklistChanges?: number
    commentChanges?: number
    created?: boolean
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

function isPlannedNextSection(title: string) {
  return /^planned next/i.test(title.trim())
}

function resolveStatusFromCheckboxes(
  related: GameStatusCheckbox[],
  current: TaskStatus
): TaskStatus {
  const doneCount = related.filter((item) => item.state === "done").length
  const partialCount = related.filter((item) => item.state === "partial").length

  if (related.length > 0 && doneCount === related.length && partialCount === 0) {
    return "done"
  }
  if (partialCount > 0 || doneCount > 0) {
    return "in_progress"
  }
  return current
}

function checkboxesToChecklist(items: GameStatusCheckbox[]): PlanChecklistItem[] {
  return items.map((item) => ({
    title: item.text,
    completed: item.state === "done",
  }))
}

function resolveCardPlacement(section: GameStatusSection) {
  const status = resolveStatusFromCheckboxes(section.checkboxes, "backlog")

  if (section.category && isGameStatusSystemCategory(section.category)) {
    return {
      boardKey: "systems" as BoardKey,
      listName: section.category,
      status,
      system: section.category,
    }
  }

  return {
    boardKey: "dev" as BoardKey,
    listName: resolveListForStatus("dev", status) ?? "Planned",
    status,
    system: section.category ?? undefined,
  }
}

async function loadTaskRows(supabase: Client, projectId: string) {
  const { data } = await supabase
    .from("tasks")
    .select("id, identifier, title, status, list_id")
    .eq("project_id", projectId)
    .is("deleted_at", null)

  return (data ?? []) as TaskRow[]
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

  const existing = checklistItems ?? []
  let checklistUpdated = 0
  let checklistAdded = 0
  let position = existing.length

  for (const item of existing) {
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

    checklistUpdated += 1
  }

  for (const checkbox of related) {
    const alreadyExists = existing.some((item) => textsLikelyMatch(checkbox.text, item.title))
    if (alreadyExists) {
      continue
    }

    const completed = checkbox.state === "done"
    const { error } = await supabase.from("task_checklist_items").insert({
      task_id: taskId,
      title: checkbox.text,
      position,
      completed,
      completed_at: completed ? new Date().toISOString() : null,
    })

    if (!error) {
      checklistAdded += 1
      position += 1
      existing.push({
        id: "",
        title: checkbox.text,
        completed,
      })
    }
  }

  return { checklistUpdated, checklistAdded }
}

async function provisionTaskFromSection(
  supabase: Client,
  input: {
    projectId: string
    workspaceId: string
    userId: string
    section: GameStatusSection
    title?: string
    boardKey?: BoardKey
    listName?: string
    status?: TaskStatus
  }
) {
  const title = input.title ?? input.section.title
  const placement = input.boardKey
    ? {
        boardKey: input.boardKey,
        listName: input.listName ?? "Planned",
        status: input.status ?? "backlog",
        system: input.section.category ?? undefined,
      }
    : resolveCardPlacement({ ...input.section, title })

  const description = [
    input.section.statusLine ? `**Status:** ${input.section.statusLine}` : null,
    placement.system ? `**System:** ${placement.system}` : null,
    "Imported from GAME_STATUS.md",
  ]
    .filter(Boolean)
    .join("\n\n")

  const listResult = await ensureProjectBoardList(
    supabase,
    input.projectId,
    placement.boardKey,
    placement.listName
  )

  const upsert = await upsertPlanTaskCard(supabase, {
    projectId: input.projectId,
    workspaceId: input.workspaceId,
    userId: input.userId,
    card: {
      title,
      boardKey: placement.boardKey,
      listName: placement.listName,
      status: placement.status,
      system: placement.system,
      description,
      checklist: checkboxesToChecklist(input.section.checkboxes),
    },
  })

  const { data: task } = await supabase
    .from("tasks")
    .select("id, identifier, title, status, list_id")
    .eq("id", upsert.taskId)
    .maybeSingle()

  return {
    task: task as TaskRow,
    created: upsert.created,
    checklistsAdded: upsert.checklistsAdded,
    listsCreated: listResult.created ? 1 : 0,
  }
}

export async function applyGameStatusMarkdownUpdates(
  supabase: Client,
  input: {
    projectId: string
    workspaceId?: string
    userId?: string | null
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
  const canProvision = Boolean(input.workspaceId && input.userId)

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
    tasksCreated: 0,
    checklistsUpdated: 0,
    checklistsAdded: 0,
    listMoves: 0,
    listsCreated: 0,
    commentsAdded: 0,
    applied: [],
  }

  let taskRows = await loadTaskRows(supabase, input.projectId)
  const handledTaskIds = new Set<string>()

  function rememberTask(task: TaskRow) {
    if (!taskRows.some((row) => row.id === task.id)) {
      taskRows.push(task)
    }
  }

  async function resolveExistingTask(title: string, boardKey?: BoardKey) {
    const inMemory = taskRows.find((row) => textsLikelyMatch(title, row.title))
    if (inMemory) {
      return inMemory
    }

    const preferred = boardKey
      ? await findTaskByTitleFuzzy(supabase, input.projectId, title, { boardKey })
      : null
    const match =
      preferred ?? (await findTaskByTitleFuzzy(supabase, input.projectId, title))
    if (!match) {
      return null
    }

    const task: TaskRow = {
      id: match.id,
      identifier: match.identifier,
      title: match.title,
      status: match.status as TaskStatus,
      list_id: match.list_id,
    }
    rememberTask(task)
    return task
  }

  if (canProvision) {
    for (const section of getSyncableSections(document)) {
      const existing = await resolveExistingTask(
        section.title,
        isGameStatusSystemCategory(section.category) ? "systems" : "dev"
      )
      if (existing) {
        continue
      }

      try {
        const provisioned = await provisionTaskFromSection(supabase, {
          projectId: input.projectId,
          workspaceId: input.workspaceId!,
          userId: input.userId!,
          section,
        })

        if (provisioned.created) {
          result.tasksCreated += 1
        }
        result.checklistsAdded += provisioned.checklistsAdded
        result.listsCreated += provisioned.listsCreated
        rememberTask(provisioned.task)
        result.applied.push({
          identifier: provisioned.task.identifier,
          title: provisioned.task.title,
          created: provisioned.created,
          note: "Created from GAME_STATUS.md section",
        })
      } catch (error) {
        console.error(`GAME_STATUS provision failed for ${section.title}:`, error)
      }
    }

    for (const section of document.sections) {
      if (!isPlannedNextSection(section.title)) {
        continue
      }

      for (const checkbox of section.checkboxes) {
        const title = checkbox.text.trim()
        if (!title) {
          continue
        }

        const existing = await resolveExistingTask(title, "dev")
        if (existing) {
          continue
        }

        try {
          const provisioned = await provisionTaskFromSection(supabase, {
            projectId: input.projectId,
            workspaceId: input.workspaceId!,
            userId: input.userId!,
            section: { ...section, title, checkboxes: [checkbox] },
            title,
            boardKey: "dev",
            listName: "Planned",
            status:
              checkbox.state === "done"
                ? "done"
                : checkbox.state === "partial"
                  ? "in_progress"
                  : "backlog",
          })

          if (provisioned.created) {
            result.tasksCreated += 1
          }
          result.listsCreated += provisioned.listsCreated
          rememberTask(provisioned.task)
          result.applied.push({
            identifier: provisioned.task.identifier,
            title: provisioned.task.title,
            created: provisioned.created,
            note: "Created from Planned next in GAME_STATUS.md",
          })
        } catch (error) {
          console.error(`GAME_STATUS planned-next provision failed for ${title}:`, error)
        }
      }
    }
  }

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

    const checklist = await syncTaskChecklistItems(supabase, task.id, related)
    result.checklistsUpdated += checklist.checklistUpdated
    result.checklistsAdded += checklist.checklistAdded

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

    if (changed || checklist.checklistUpdated > 0 || checklist.checklistAdded > 0 || commentChanges > 0) {
      result.applied.push({
        identifier: task.identifier,
        title: task.title,
        status: patch.status,
        listName,
        checklistChanges: checklist.checklistUpdated + checklist.checklistAdded,
        commentChanges,
        note,
      })
    }
  }

  for (const section of getSyncableSections(document)) {
    const task =
      (await resolveExistingTask(
        section.title,
        isGameStatusSystemCategory(section.category) ? "systems" : "dev"
      )) ?? taskRows.find((row) => textsLikelyMatch(section.title, row.title))
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
