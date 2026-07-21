import type { SupabaseClient } from "@supabase/supabase-js"

import type { TaskListFilters, TaskWithPeople } from "@/lib/auth/task-context"
import type { Database } from "@/lib/database.types"
import { enrichBoardTasks } from "@/lib/tasks/enrich-board-tasks"

type QueryClient = SupabaseClient<Database>

export async function queryBoardTasks(
  supabase: QueryClient,
  projectId: string,
  filters: TaskListFilters = {}
): Promise<TaskWithPeople[]> {
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("board_position", { ascending: true })
    .order("created_at", { ascending: false })

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }

  if (filters.assigneeId === "unassigned") {
    query = query.is("assignee_id", null)
  } else if (filters.assigneeId && filters.assigneeId !== "all") {
    query = query.eq("assignee_id", filters.assigneeId)
  }

  if (filters.search?.trim()) {
    query = query.or(
      `title.ilike.%${filters.search.trim()}%,identifier.ilike.%${filters.search.trim()}%`
    )
  }

  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority)
  }

  if (filters.discipline && filters.discipline !== "all") {
    query = query.eq("discipline", filters.discipline)
  }

  if (filters.milestoneId && filters.milestoneId !== "all") {
    query = query.eq("milestone_id", filters.milestoneId)
  }

  if (filters.labelId && filters.labelId !== "all") {
    const { data: labelLinks } = await supabase
      .from("task_labels")
      .select("task_id")
      .eq("label_id", filters.labelId)

    const labeledTaskIds = labelLinks?.map((link) => link.task_id) ?? []
    if (labeledTaskIds.length === 0) {
      return []
    }

    query = query.in("id", labeledTaskIds)
  }

  const { data: tasks, error } = await query

  if (error || !tasks?.length) {
    return []
  }

  return enrichBoardTasks(supabase, tasks)
}
