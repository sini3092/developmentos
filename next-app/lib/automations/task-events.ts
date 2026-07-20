import type { Task, TaskStatus } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

import { dispatchAutomationEvents, type AutomationEvent } from "@/lib/automations/run"

type TaskAutomationSnapshot = Pick<
  Task,
  | "id"
  | "identifier"
  | "title"
  | "status"
  | "priority"
  | "discipline"
  | "assignee_id"
  | "project_id"
  | "workspace_id"
>

async function getTaskWithProjectSlug(taskId: string) {
  const supabase = await createClient()
  const { data: task } = await supabase
    .from("tasks")
    .select(
      "id, identifier, title, status, priority, discipline, assignee_id, project_id, workspace_id"
    )
    .eq("id", taskId)
    .maybeSingle()

  if (!task) {
    return null
  }

  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", task.project_id)
    .maybeSingle()

  if (!project) {
    return null
  }

  return { task, projectSlug: project.slug }
}

export async function getTaskAutomationSnapshot(
  taskId: string
): Promise<TaskAutomationSnapshot | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("tasks")
    .select(
      "id, identifier, title, status, priority, discipline, assignee_id, project_id, workspace_id"
    )
    .eq("id", taskId)
    .maybeSingle()

  return data
}

function buildUpdateEvents(
  snapshot: { task: TaskAutomationSnapshot; projectSlug: string },
  previous: TaskAutomationSnapshot
) {
  const events: AutomationEvent[] = []
  const base = {
    projectId: snapshot.task.project_id,
    projectSlug: snapshot.projectSlug,
    workspaceId: snapshot.task.workspace_id,
    task: snapshot.task,
  }

  if (snapshot.task.status !== previous.status) {
    events.push({
      ...base,
      trigger: "task_status_changed",
      previousStatus: previous.status,
    })
  }

  if (snapshot.task.assignee_id !== previous.assignee_id) {
    events.push({
      ...base,
      trigger: "task_assigned",
      previousAssigneeId: previous.assignee_id,
    })
  }

  return events
}

export async function runTaskAutomationsForCreate(taskId: string) {
  const snapshot = await getTaskWithProjectSlug(taskId)
  if (!snapshot) {
    return
  }

  await dispatchAutomationEvents([
    {
      trigger: "task_created",
      projectId: snapshot.task.project_id,
      projectSlug: snapshot.projectSlug,
      workspaceId: snapshot.task.workspace_id,
      task: snapshot.task,
    },
  ])
}

export async function runTaskAutomationsForUpdate(
  taskId: string,
  previous: TaskAutomationSnapshot
) {
  const snapshot = await getTaskWithProjectSlug(taskId)
  if (!snapshot) {
    return
  }

  await dispatchAutomationEvents(buildUpdateEvents(snapshot, previous))
}

export async function runTaskAutomationsForStatusChange(
  taskId: string,
  previousStatus: TaskStatus
) {
  const snapshot = await getTaskWithProjectSlug(taskId)
  if (!snapshot || snapshot.task.status === previousStatus) {
    return
  }

  await dispatchAutomationEvents([
    {
      trigger: "task_status_changed",
      projectId: snapshot.task.project_id,
      projectSlug: snapshot.projectSlug,
      workspaceId: snapshot.task.workspace_id,
      task: snapshot.task,
      previousStatus,
    },
  ])
}
