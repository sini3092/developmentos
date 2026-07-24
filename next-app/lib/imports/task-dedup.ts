import type { SupabaseClient } from "@supabase/supabase-js"

import type { BoardKey } from "@/lib/constants/board-keys"
import type { Database } from "@/lib/database.types"
import { textsLikelyMatch } from "@/lib/imports/game-status-parser"

type Client = SupabaseClient<Database>

export type TaskTitleMatch = {
  id: string
  identifier: string
  title: string
  description: string | null
  priority: string
  status: string
  list_id: string | null
  milestone_id: string | null
}

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

export async function findTaskByTitleFuzzy(
  supabase: Client,
  projectId: string,
  title: string,
  options?: { listId?: string | null; boardKey?: BoardKey | string | null }
): Promise<TaskTitleMatch | null> {
  const trimmed = title.trim()
  if (!trimmed) {
    return null
  }

  const exact = await findTaskByTitle(supabase, projectId, trimmed, options)
  if (exact) {
    return exact
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, identifier, title, description, priority, status, list_id, milestone_id")
    .eq("project_id", projectId)
    .is("deleted_at", null)

  const fuzzyMatches = (tasks ?? []).filter((task) => textsLikelyMatch(trimmed, task.title))
  if (fuzzyMatches.length === 0) {
    return null
  }

  if (options?.boardKey) {
    const { data: lists } = await supabase
      .from("board_lists")
      .select("id, board_key")
      .eq("project_id", projectId)
      .eq("board_key", options.boardKey)

    const listIds = new Set((lists ?? []).map((list) => list.id))
    const scoped = fuzzyMatches.filter((task) => task.list_id && listIds.has(task.list_id))
    if (scoped.length > 0) {
      return scoped[0]
    }
  }

  if (fuzzyMatches.length === 1) {
    return fuzzyMatches[0]
  }

  const normalized = normalizeTaskTitle(trimmed)
  const best = fuzzyMatches.find((task) => normalizeTaskTitle(task.title) === normalized)
  return best ?? fuzzyMatches[0]
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
