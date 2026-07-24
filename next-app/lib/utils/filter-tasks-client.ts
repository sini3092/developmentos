import type { TaskListFilters, TaskWithPeople } from "@/lib/auth/task-context"
import { isTaskInProgress } from "@/lib/utils/roadmap"
import { isTaskOpen } from "@/lib/utils/task-workflow"

function isTaskNotStarted(task: TaskWithPeople) {
  if (!isTaskOpen(task)) {
    return false
  }
  return (task.progress ?? 0) === 0
}

function isTaskWorkable(task: TaskWithPeople) {
  return isTaskNotStarted(task) && task.status !== "blocked"
}

export function filterTasksClient(tasks: TaskWithPeople[], filters: TaskListFilters) {
  const search = filters.search?.trim().toLowerCase()
  const workState = filters.workState ?? "all"

  return tasks.filter((task) => {
    if (filters.status && filters.status !== "all" && task.status !== filters.status) {
      return false
    }

    if (filters.listId && filters.listId !== "all" && task.list_id !== filters.listId) {
      return false
    }

    if (filters.assigneeId === "unassigned" && task.assignee_id) {
      return false
    }

    if (
      filters.assigneeId &&
      filters.assigneeId !== "all" &&
      task.assignee_id !== filters.assigneeId
    ) {
      return false
    }

    if (filters.priority && filters.priority !== "all" && task.priority !== filters.priority) {
      return false
    }

    if (
      filters.discipline &&
      filters.discipline !== "all" &&
      task.discipline !== filters.discipline
    ) {
      return false
    }

    if (
      filters.milestoneId &&
      filters.milestoneId !== "all" &&
      task.milestone_id !== filters.milestoneId
    ) {
      return false
    }

    if (search) {
      const haystack = `${task.title} ${task.identifier}`.toLowerCase()
      if (!haystack.includes(search)) {
        return false
      }
    }

    if (workState === "started" && !isTaskInProgress(task.progress)) {
      return false
    }

    if (workState === "not_started" && !isTaskNotStarted(task)) {
      return false
    }

    if (workState === "workable" && !isTaskWorkable(task)) {
      return false
    }

    return true
  })
}
