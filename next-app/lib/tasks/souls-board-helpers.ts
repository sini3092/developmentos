import type { SupabaseClient } from "@supabase/supabase-js"

import type { BoardKey } from "@/lib/constants/board-keys"
import { BOARD_LIST_COLORS, type BoardListColor } from "@/lib/constants/board-lists"
import type { Database, TaskPriority, TaskStatus } from "@/lib/database.types"
import { resolveStatusFromList } from "@/lib/imports/list-workflow"
import { textsLikelyMatch } from "@/lib/imports/game-status-parser"

type Client = SupabaseClient<Database>

export async function resolveProjectCommentAuthor(
  supabase: Client,
  projectId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("project_members")
    .select("user_id, role")
    .eq("project_id", projectId)
    .order("joined_at", { ascending: true })

  const members = data ?? []
  const owner = members.find((member) => member.role === "owner")
  if (owner) {
    return owner.user_id
  }

  const lead = members.find((member) => member.role === "project_lead")
  if (lead) {
    return lead.user_id
  }

  return members[0]?.user_id ?? null
}

export async function resolveBoardList(
  supabase: Client,
  projectId: string,
  input: { listId?: string; listName?: string; boardKey?: BoardKey | string | null }
) {
  if (input.listId) {
    const { data } = await supabase
      .from("board_lists")
      .select("id, name, color, position, board_key")
      .eq("id", input.listId)
      .eq("project_id", projectId)
      .maybeSingle()
    return data
  }

  if (!input.listName) {
    return null
  }

  let query = supabase
    .from("board_lists")
    .select("id, name, color, position, board_key")
    .eq("project_id", projectId)
    .ilike("name", input.listName)

  if (input.boardKey) {
    query = query.eq("board_key", input.boardKey)
  }

  const { data } = await query.maybeSingle()
  return data
}

export async function resolveTaskByReference(
  supabase: Client,
  projectId: string,
  input: { taskId?: string; title?: string; identifier?: string }
) {
  if (input.taskId) {
    const { data } = await supabase
      .from("tasks")
      .select("id, identifier, title, status, list_id, board_position")
      .eq("id", input.taskId)
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .maybeSingle()
    return data
  }

  if (input.identifier) {
    const { data } = await supabase
      .from("tasks")
      .select("id, identifier, title, status, list_id, board_position")
      .eq("project_id", projectId)
      .eq("identifier", input.identifier)
      .is("deleted_at", null)
      .maybeSingle()
    return data
  }

  if (!input.title) {
    return null
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, identifier, title, status, list_id, board_position")
    .eq("project_id", projectId)
    .is("deleted_at", null)

  return (
    (tasks ?? []).find((task) => textsLikelyMatch(task.title, input.title!)) ??
    (tasks ?? []).find((task) => task.title.toLowerCase() === input.title!.toLowerCase()) ??
    null
  )
}

export async function moveTaskToBoardList(
  supabase: Client,
  projectId: string,
  taskId: string,
  input: { listId?: string; listName?: string; boardKey?: BoardKey | string | null; boardPosition?: number }
) {
  const list = await resolveBoardList(supabase, projectId, input)
  if (!list) {
    throw new Error("Target board list not found.")
  }

  let boardPosition = input.boardPosition
  if (boardPosition === undefined) {
    const { data: lastTask } = await supabase
      .from("tasks")
      .select("board_position")
      .eq("list_id", list.id)
      .is("deleted_at", null)
      .order("board_position", { ascending: false })
      .limit(1)
      .maybeSingle()

    boardPosition = (lastTask?.board_position ?? 0) + 1000
  }

  const nextStatus = resolveStatusFromList(
    list.board_key as BoardKey | null,
    list.name
  )

  const { data, error } = await supabase
    .from("tasks")
    .update({
      list_id: list.id,
      board_position: boardPosition,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("project_id", projectId)
    .select("id, identifier, title, status, list_id, board_position")
    .single()

  if (error) {
    throw error
  }

  if (nextStatus === "done") {
    const { data: checklistItems } = await supabase
      .from("task_checklist_items")
      .select("id")
      .eq("task_id", taskId)
      .eq("completed", false)

    for (const item of checklistItems ?? []) {
      await supabase
        .from("task_checklist_items")
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", item.id)
    }
  }

  return { task: data, list }
}

export async function addTaskCommentIfMissing(
  supabase: Client,
  input: {
    taskId: string
    authorId: string
    body: string
    sourceLabel?: string
  }
) {
  const body = input.body.trim()
  if (!body) {
    return { added: false }
  }

  const normalizedBody = input.sourceLabel
    ? `[${input.sourceLabel}]\n${body}`
    : body

  const { data: existing } = await supabase
    .from("task_comments")
    .select("id, body")
    .eq("task_id", input.taskId)

  const alreadyExists = (existing ?? []).some(
    (comment) => comment.body.trim() === normalizedBody || comment.body.trim() === body
  )

  if (alreadyExists) {
    return { added: false }
  }

  const { data, error } = await supabase
    .from("task_comments")
    .insert({
      task_id: input.taskId,
      author_id: input.authorId,
      body: normalizedBody,
    })
    .select("id")
    .single()

  if (error) {
    throw error
  }

  return { added: true, commentId: data.id }
}

export async function setTaskChecklistCompletion(
  supabase: Client,
  taskId: string,
  input: {
    items?: string[]
    completeAll?: boolean
    uncompleteAll?: boolean
    completed: boolean
  }
) {
  const { data: checklistItems } = await supabase
    .from("task_checklist_items")
    .select("id, title, completed")
    .eq("task_id", taskId)

  let updated = 0
  for (const item of checklistItems ?? []) {
    const targeted = input.completeAll || input.uncompleteAll
      ? true
      : (input.items ?? []).some((target) => textsLikelyMatch(target, item.title))

    if (!targeted || item.completed === input.completed) {
      continue
    }

    await supabase
      .from("task_checklist_items")
      .update({
        completed: input.completed,
        completed_at: input.completed ? new Date().toISOString() : null,
      })
      .eq("id", item.id)

    updated += 1
  }

  return updated
}

export async function updateBoardListForProject(
  supabase: Client,
  projectId: string,
  input: {
    listId?: string
    listName?: string
    boardKey?: BoardKey | string | null
    name?: string
    color?: string
    position?: number
  }
) {
  const list = await resolveBoardList(supabase, projectId, input)
  if (!list) {
    throw new Error("Board list not found.")
  }

  const patch: Database["public"]["Tables"]["board_lists"]["Update"] = {
    updated_at: new Date().toISOString(),
  }

  if (input.name?.trim()) {
    patch.name = input.name.trim()
  }

  if (input.color) {
    const normalized = input.color.toLowerCase()
    if (!BOARD_LIST_COLORS.includes(normalized as BoardListColor)) {
      throw new Error(`Invalid list color. Use one of: ${BOARD_LIST_COLORS.join(", ")}`)
    }
    patch.color = normalized
  }

  if (typeof input.position === "number") {
    patch.position = input.position
  }

  const { data, error } = await supabase
    .from("board_lists")
    .update(patch)
    .eq("id", list.id)
    .eq("project_id", projectId)
    .select("id, name, color, position, board_key")
    .single()

  if (error) {
    throw error
  }

  return data
}

export async function updateTaskFields(
  supabase: Client,
  projectId: string,
  taskId: string,
  patch: {
    title?: string
    description?: string
    priority?: TaskPriority
    status?: TaskStatus
    listName?: string
    boardKey?: BoardKey | string | null
  }
) {
  const update: Database["public"]["Tables"]["tasks"]["Update"] = {
    updated_at: new Date().toISOString(),
  }

  if (patch.title?.trim()) {
    update.title = patch.title.trim()
  }
  if (patch.description !== undefined) {
    update.description = patch.description
  }
  if (patch.priority) {
    update.priority = patch.priority
  }
  if (patch.status) {
    update.status = patch.status
  }

  if (patch.listName) {
    const list = await resolveBoardList(supabase, projectId, {
      listName: patch.listName,
      boardKey: patch.boardKey,
    })
    if (list) {
      update.list_id = list.id
      if (!patch.status) {
        update.status = resolveStatusFromList(list.board_key as BoardKey | null, list.name)
      }
    }
  }

  const { data, error } = await supabase
    .from("tasks")
    .update(update)
    .eq("id", taskId)
    .eq("project_id", projectId)
    .select("id, identifier, title, status, priority, list_id")
    .single()

  if (error) {
    throw error
  }

  return data
}
