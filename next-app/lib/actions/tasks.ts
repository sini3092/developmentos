"use server"

import { revalidatePath } from "next/cache"

import type { Discipline, TaskPriority, TaskStatus } from "@/lib/database.types"
import {
  getTaskAutomationSnapshot,
  runTaskAutomationsForCreate,
  runTaskAutomationsForStatusChange,
  runTaskAutomationsForUpdate,
} from "@/lib/automations/task-events"
import { createClient } from "@/lib/supabase/server"

export type TaskActionState = {
  error?: string
  success?: string
  taskId?: string
}

export async function createTask(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const status = String(formData.get("status") ?? "backlog") as TaskStatus
  const listId = String(formData.get("listId") ?? "")
  const priority = String(formData.get("priority") ?? "none") as TaskPriority
  const assigneeId = String(formData.get("assigneeId") ?? "")
  const discipline = String(formData.get("discipline") ?? "")
  const dueDate = String(formData.get("dueDate") ?? "")

  if (!projectId || !title) {
    return { error: "Task title is required." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_task", {
    p_project_id: projectId,
    p_title: title,
    p_description: description || null,
    p_status: status,
    p_priority: priority,
    p_assignee_id: assigneeId || null,
    p_discipline: (discipline || null) as Discipline | null,
    p_due_date: dueDate || null,
    p_list_id: listId || null,
  })

  if (error) {
    return { error: error.message }
  }

  await runTaskAutomationsForCreate(data.id)

  revalidatePath(`/projects/${slug}/tasks`)
  return { success: "Task created.", taskId: data.id }
}

export async function updateTask(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const taskId = String(formData.get("taskId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const status = String(formData.get("status") ?? "backlog") as TaskStatus
  const priority = String(formData.get("priority") ?? "none") as TaskPriority
  const assigneeId = String(formData.get("assigneeId") ?? "")
  const discipline = String(formData.get("discipline") ?? "")
  const dueDate = String(formData.get("dueDate") ?? "")
  const progress = Number(formData.get("progress") ?? 0)
  const initiativeId = String(formData.get("initiativeId") ?? "")
  const milestoneId = String(formData.get("milestoneId") ?? "")

  if (!taskId || !title) {
    return { error: "Task title is required." }
  }

  const previous = await getTaskAutomationSnapshot(taskId)
  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({
      title,
      description: description || null,
      status,
      priority,
      assignee_id: assigneeId || null,
      discipline: (discipline || null) as Discipline | null,
      due_date: dueDate || null,
      progress: Math.min(100, Math.max(0, progress)),
      initiative_id: initiativeId || null,
      milestone_id: milestoneId || null,
    })
    .eq("id", taskId)

  if (error) {
    return { error: error.message }
  }

  if (previous) {
    await runTaskAutomationsForUpdate(taskId, previous)
  }

  revalidatePath(`/projects/${slug}/tasks`)
  return { success: "Task updated." }
}

export async function moveTaskOnBoard(
  slug: string,
  taskId: string,
  listId: string,
  boardPosition: number
) {
  const previous = await getTaskAutomationSnapshot(taskId)
  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({ list_id: listId, board_position: boardPosition })
    .eq("id", taskId)

  if (error) {
    return { error: error.message }
  }

  if (previous) {
    await runTaskAutomationsForUpdate(taskId, previous)
  }

  return { success: true }
}

export async function updateTaskProgress(slug: string, taskId: string, progress: number) {
  const clamped = Math.min(100, Math.max(0, Math.round(progress)))
  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({ progress: clamped, updated_at: new Date().toISOString() })
    .eq("id", taskId)

  if (error) {
    return { error: error.message }
  }

  return { success: true, progress: clamped }
}

export async function updateTaskStatus(
  taskId: string,
  slug: string,
  status: TaskStatus
) {
  const previous = await getTaskAutomationSnapshot(taskId)
  const supabase = await createClient()
  const { error } = await supabase.from("tasks").update({ status }).eq("id", taskId)

  if (error) {
    return { error: error.message }
  }

  if (previous) {
    await runTaskAutomationsForStatusChange(taskId, previous.status)
  }

  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
  return { success: true }
}

export async function addTaskComment(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const taskId = String(formData.get("taskId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const body = String(formData.get("body") ?? "").trim()

  if (!taskId || !body) {
    return { error: "Comment cannot be empty." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in to comment." }
  }

  const { error } = await supabase.from("task_comments").insert({
    task_id: taskId,
    author_id: user.id,
    body,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: "Comment added." }
}

export async function archiveTask(taskId: string, slug: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString(), status: "cancelled" })
    .eq("id", taskId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

const UNCHANGED = "__unchanged__"

function revalidateTaskViews(slug: string) {
  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
  revalidatePath(`/projects/${slug}/tasks/table`)
  revalidatePath("/")
  revalidatePath("/my-work")
}

export async function bulkUpdateTasks(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const slug = String(formData.get("slug") ?? "")
  const taskIds = String(formData.get("taskIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
  const status = String(formData.get("status") ?? UNCHANGED)
  const priority = String(formData.get("priority") ?? UNCHANGED)
  const assigneeId = String(formData.get("assigneeId") ?? UNCHANGED)
  const discipline = String(formData.get("discipline") ?? UNCHANGED)

  if (!slug || taskIds.length === 0) {
    return { error: "Select at least one task." }
  }

  const updates: {
    status?: TaskStatus
    priority?: TaskPriority
    assignee_id?: string | null
    discipline?: Discipline | null
  } = {}

  if (status !== UNCHANGED) {
    updates.status = status as TaskStatus
  }

  if (priority !== UNCHANGED) {
    updates.priority = priority as TaskPriority
  }

  if (assigneeId === "__unassigned__") {
    updates.assignee_id = null
  } else if (assigneeId !== UNCHANGED) {
    updates.assignee_id = assigneeId
  }

  if (discipline === "__clear__") {
    updates.discipline = null
  } else if (discipline !== UNCHANGED) {
    updates.discipline = discipline as Discipline
  }

  if (Object.keys(updates).length === 0) {
    return { error: "Choose at least one field to update." }
  }

  const supabase = await createClient()
  const previousSnapshots = await Promise.all(
    taskIds.map((id) => getTaskAutomationSnapshot(id))
  )
  const { error } = await supabase.from("tasks").update(updates).in("id", taskIds)

  if (error) {
    return { error: error.message }
  }

  await Promise.all(
    taskIds.map(async (taskId, index) => {
      const previous = previousSnapshots[index]
      if (previous) {
        await runTaskAutomationsForUpdate(taskId, previous)
      }
    })
  )

  revalidateTaskViews(slug)
  return {
    success: `Updated ${taskIds.length} task${taskIds.length === 1 ? "" : "s"}.`,
  }
}

export async function bulkArchiveTasks(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const slug = String(formData.get("slug") ?? "")
  const taskIds = String(formData.get("taskIds") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)

  if (!slug || taskIds.length === 0) {
    return { error: "Select at least one task." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("tasks")
    .update({
      deleted_at: new Date().toISOString(),
      status: "cancelled",
    })
    .in("id", taskIds)

  if (error) {
    return { error: error.message }
  }

  revalidateTaskViews(slug)
  return {
    success: `Archived ${taskIds.length} task${taskIds.length === 1 ? "" : "s"}.`,
  }
}

export async function createProjectLabel(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const color = String(formData.get("color") ?? "slate")

  if (!projectId || !name) {
    return { error: "Label name is required." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("labels").insert({
    project_id: projectId,
    name,
    color,
  })

  if (error) {
    if (error.message.includes("labels_project_id_name_key")) {
      return { error: "A label with this name already exists." }
    }
    return { error: error.message }
  }

  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
  return { success: "Label created." }
}

export async function toggleTaskLabel(
  taskId: string,
  labelId: string,
  slug: string,
  attach: boolean
) {
  const supabase = await createClient()
  const { error } = attach
    ? await supabase.from("task_labels").insert({ task_id: taskId, label_id: labelId })
    : await supabase
        .from("task_labels")
        .delete()
        .eq("task_id", taskId)
        .eq("label_id", labelId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function addChecklistItem(
  _prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const taskId = String(formData.get("taskId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const title = String(formData.get("title") ?? "").trim()

  if (!taskId || !title) {
    return { error: "Checklist item is required." }
  }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("task_checklist_items")
    .select("position")
    .eq("task_id", taskId)
    .order("position", { ascending: false })
    .limit(1)

  const position = (existing?.[0]?.position ?? -1) + 1

  const { error } = await supabase.from("task_checklist_items").insert({
    task_id: taskId,
    title,
    position,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: "Checklist item added." }
}

export async function toggleChecklistItem(
  itemId: string,
  slug: string,
  completed: boolean
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from("task_checklist_items")
    .update({
      completed,
      completed_by: completed ? user?.id ?? null : null,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq("id", itemId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function deleteChecklistItem(itemId: string, slug: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("task_checklist_items")
    .delete()
    .eq("id", itemId)

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function reorderChecklistItems(
  slug: string,
  taskId: string,
  itemIds: string[]
) {
  const supabase = await createClient()

  const updates = itemIds.map((id, index) =>
    supabase
      .from("task_checklist_items")
      .update({ position: (index + 1) * 1000 })
      .eq("id", id)
      .eq("task_id", taskId)
  )

  const results = await Promise.all(updates)
  const failed = results.find((result) => result.error)
  if (failed?.error) {
    return { error: failed.error.message }
  }

  return { success: true }
}
