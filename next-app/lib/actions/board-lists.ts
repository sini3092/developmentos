"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import { BOARD_LIST_COLORS } from "@/lib/constants/board-lists"

export async function createBoardList(slug: string, projectId: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) {
    return { error: "List name is required." }
  }

  const supabase = await createClient()

  const { data: last } = await supabase
    .from("board_lists")
    .select("position")
    .eq("project_id", projectId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  const color = BOARD_LIST_COLORS[Math.floor(Math.random() * BOARD_LIST_COLORS.length)]

  const { error } = await supabase.from("board_lists").insert({
    project_id: projectId,
    name: trimmed,
    color,
    position: (last?.position ?? 0) + 1000,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${slug}/tasks/board`)
  return { success: true }
}

export async function renameBoardList(slug: string, listId: string, name: string) {
  const trimmed = name.trim()
  if (!trimmed) {
    return { error: "List name is required." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("board_lists")
    .update({ name: trimmed, updated_at: new Date().toISOString() })
    .eq("id", listId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${slug}/tasks/board`)
  return { success: true }
}

export async function reorderBoardLists(slug: string, listIds: string[]) {
  const supabase = await createClient()

  const updates = listIds.map((id, index) =>
    supabase
      .from("board_lists")
      .update({ position: (index + 1) * 1000, updated_at: new Date().toISOString() })
      .eq("id", id)
  )

  const results = await Promise.all(updates)
  const failed = results.find((result) => result.error)
  if (failed?.error) {
    return { error: failed.error.message }
  }

  revalidatePath(`/projects/${slug}/tasks/board`)
  return { success: true }
}

export async function deleteBoardList(
  slug: string,
  projectId: string,
  listId: string,
  moveToListId?: string | null
) {
  const supabase = await createClient()

  const { data: list } = await supabase
    .from("board_lists")
    .select("id")
    .eq("id", listId)
    .eq("project_id", projectId)
    .maybeSingle()

  if (!list) {
    return { error: "List not found." }
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id")
    .eq("list_id", listId)
    .is("deleted_at", null)

  const taskCount = tasks?.length ?? 0

  if (taskCount > 0) {
    if (moveToListId) {
      if (moveToListId === listId) {
        return { error: "Choose a different list to move cards to." }
      }

      const { data: targetList } = await supabase
        .from("board_lists")
        .select("id")
        .eq("id", moveToListId)
        .eq("project_id", projectId)
        .maybeSingle()

      if (!targetList) {
        return { error: "Target list not found." }
      }

      const { error: moveError } = await supabase
        .from("tasks")
        .update({ list_id: moveToListId })
        .eq("list_id", listId)
        .is("deleted_at", null)

      if (moveError) {
        return { error: moveError.message }
      }
    } else {
      const { error: archiveError } = await supabase
        .from("tasks")
        .update({ deleted_at: new Date().toISOString(), list_id: null })
        .eq("list_id", listId)
        .is("deleted_at", null)

      if (archiveError) {
        return { error: archiveError.message }
      }
    }
  }

  const { error } = await supabase.from("board_lists").delete().eq("id", listId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${slug}/tasks/board`)
  revalidatePath(`/projects/${slug}/roadmap`)
  return { success: true }
}
