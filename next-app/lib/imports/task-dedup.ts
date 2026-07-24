import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"

type Client = SupabaseClient<Database>

export function normalizeTaskTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/^card:\s*/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export async function findTaskByTitle(
  supabase: Client,
  projectId: string,
  title: string,
  options?: { listId?: string | null; boardKey?: string | null }
) {
  const normalized = normalizeTaskTitle(title)
  if (!normalized) {
    return null
  }

  let query = supabase
    .from("tasks")
    .select("id, identifier, title, description, priority, status, list_id, milestone_id")
    .eq("project_id", projectId)
    .is("deleted_at", null)

  if (options?.listId) {
    query = query.eq("list_id", options.listId)
  }

  const { data } = await query

  const matches =
    data?.filter((task) => normalizeTaskTitle(task.title) === normalized) ?? []

  if (matches.length === 0) {
    return null
  }

  if (options?.boardKey) {
    const { data: lists } = await supabase
      .from("board_lists")
      .select("id, board_key")
      .eq("project_id", projectId)
      .eq("board_key", options.boardKey)

    const listIds = new Set((lists ?? []).map((list) => list.id))
    const scoped = matches.filter((task) => task.list_id && listIds.has(task.list_id))
    if (scoped.length > 0) {
      return scoped[0]
    }
  }

  return matches[0]
}

export async function loadProjectTaskTitleIndex(supabase: Client, projectId: string) {
  const { data } = await supabase
    .from("tasks")
    .select("id, title, list_id")
    .eq("project_id", projectId)
    .is("deleted_at", null)

  const index = new Map<string, { id: string; list_id: string | null }>()
  for (const task of data ?? []) {
    index.set(normalizeTaskTitle(task.title), { id: task.id, list_id: task.list_id })
  }
  return index
}
