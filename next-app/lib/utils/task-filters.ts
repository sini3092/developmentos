import type { Discipline, TaskPriority, TaskStatus } from "@/lib/database.types"

export type TaskSearchParams = {
  status?: string
  assignee?: string
  q?: string
  priority?: string
  discipline?: string
  label?: string
  milestone?: string
  task?: string
}

export function parseTaskListFilters(query: TaskSearchParams) {
  return {
    status: (query.status as TaskStatus | "all") || "all",
    assigneeId: query.assignee || "all",
    search: query.q,
    priority: (query.priority as TaskPriority | "all") || "all",
    discipline: (query.discipline as Discipline | "all") || "all",
    labelId: query.label || "all",
    milestoneId: query.milestone || "all",
  }
}
