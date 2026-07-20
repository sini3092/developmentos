"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export type TaskDependencyActionState = {
  error?: string
  success?: string
}

function revalidateTaskPaths(slug: string) {
  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
  revalidatePath(`/projects/${slug}/tasks/table`)
  revalidatePath(`/projects/${slug}/tasks/graph`)
}

async function wouldCreateDependencyCycle(
  projectId: string,
  taskId: string,
  dependsOnTaskId: string
) {
  const supabase = await createClient()

  const { data: projectTasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("project_id", projectId)
    .is("deleted_at", null)

  const projectTaskIds = new Set((projectTasks ?? []).map((task) => task.id))
  if (!projectTaskIds.has(taskId) || !projectTaskIds.has(dependsOnTaskId)) {
    return true
  }

  const { data: dependencies } = await supabase
    .from("task_dependencies")
    .select("task_id, depends_on_task_id")
    .in("task_id", [...projectTaskIds])
    .in("depends_on_task_id", [...projectTaskIds])

  const dependentsByBlocker = new Map<string, string[]>()
  for (const dependency of dependencies ?? []) {
    const dependents = dependentsByBlocker.get(dependency.depends_on_task_id) ?? []
    dependents.push(dependency.task_id)
    dependentsByBlocker.set(dependency.depends_on_task_id, dependents)
  }

  const queue = [taskId]
  const visited = new Set<string>()

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === dependsOnTaskId) {
      return true
    }
    if (visited.has(current)) {
      continue
    }
    visited.add(current)

    for (const dependent of dependentsByBlocker.get(current) ?? []) {
      queue.push(dependent)
    }
  }

  return false
}

export async function addTaskDependency(
  _prevState: TaskDependencyActionState,
  formData: FormData
): Promise<TaskDependencyActionState> {
  const slug = String(formData.get("slug") ?? "")
  const taskId = String(formData.get("taskId") ?? "")
  const dependsOnTaskId = String(formData.get("dependsOnTaskId") ?? "")

  if (!slug || !taskId || !dependsOnTaskId) {
    return { error: "Task and blocker are required." }
  }

  if (taskId === dependsOnTaskId) {
    return { error: "A task cannot depend on itself." }
  }

  const supabase = await createClient()
  const { data: task } = await supabase
    .from("tasks")
    .select("project_id")
    .eq("id", taskId)
    .is("deleted_at", null)
    .maybeSingle()

  if (!task) {
    return { error: "Task not found." }
  }

  const { data: blocker } = await supabase
    .from("tasks")
    .select("id")
    .eq("id", dependsOnTaskId)
    .eq("project_id", task.project_id)
    .is("deleted_at", null)
    .maybeSingle()

  if (!blocker) {
    return { error: "Blocking task must belong to the same project." }
  }

  if (await wouldCreateDependencyCycle(task.project_id, taskId, dependsOnTaskId)) {
    return { error: "That dependency would create a circular chain." }
  }

  const { error } = await supabase.from("task_dependencies").insert({
    task_id: taskId,
    depends_on_task_id: dependsOnTaskId,
  })

  if (error) {
    if (error.message.includes("task_dependencies_task_id_depends_on_task_id_key")) {
      return { error: "That dependency already exists." }
    }
    return { error: error.message }
  }

  revalidateTaskPaths(slug)
  return { success: "Dependency added." }
}

export async function removeTaskDependency(
  _prevState: TaskDependencyActionState,
  formData: FormData
): Promise<TaskDependencyActionState> {
  const slug = String(formData.get("slug") ?? "")
  const linkId = String(formData.get("linkId") ?? "")

  if (!slug || !linkId) {
    return { error: "Dependency link is required." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("task_dependencies").delete().eq("id", linkId)

  if (error) {
    return { error: error.message }
  }

  revalidateTaskPaths(slug)
  return { success: "Dependency removed." }
}
