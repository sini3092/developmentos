import type { Discipline, TaskPriority, TaskStatus } from "@/lib/database.types"
import type { TaskWorkState } from "@/lib/auth/task-context"

export type TaskSearchParams = {
  status?: string
  list?: string
  assignee?: string
  q?: string
  priority?: string
  discipline?: string
  label?: string
  milestone?: string
  work?: string
  task?: string
}

const WORK_STATES = new Set<TaskWorkState>(["all", "workable", "not_started", "started"])

export function parseTaskListFilters(query: TaskSearchParams) {
  const workState = WORK_STATES.has(query.work as TaskWorkState)
    ? (query.work as TaskWorkState)
    : "all"

  return {
    status: (query.status as TaskStatus | "all") || "all",
    listId: query.list || "all",
    assigneeId: query.assignee || "all",
    search: query.q,
    priority: (query.priority as TaskPriority | "all") || "all",
    discipline: (query.discipline as Discipline | "all") || "all",
    labelId: query.label || "all",
    milestoneId: query.milestone || "all",
    workState,
  }
}
