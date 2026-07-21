import type { TaskListFilters, TaskWithPeople } from "@/lib/auth/task-context"

export function filterTasksClient(tasks: TaskWithPeople[], filters: TaskListFilters) {
  const search = filters.search?.trim().toLowerCase()

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

    return true
  })
}
