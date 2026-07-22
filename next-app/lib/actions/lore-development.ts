"use server"

import { revalidatePath } from "next/cache"

import type { LoreDevelopmentLinkType, LoreImplementationStatus } from "@/lib/database.types"
import { getProjectBoardLists } from "@/lib/auth/board-context"
import { createClient } from "@/lib/supabase/server"
import { runTaskAutomationsForCreate } from "@/lib/automations/task-events"

export type LoreDevelopmentActionState = {
  error?: string
  success?: string
  taskId?: string
}

function revalidateLoreEntryPaths(slug: string, entrySlug: string) {
  revalidatePath(`/projects/${slug}/lore/${entrySlug}`)
  revalidatePath(`/projects/${slug}/lore/${entrySlug}/edit`)
  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
}

export async function updateLoreImplementationStatus(
  _prevState: LoreDevelopmentActionState,
  formData: FormData
): Promise<LoreDevelopmentActionState> {
  const entryId = String(formData.get("entryId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")
  const status = String(formData.get("implementationStatus") ?? "") as LoreImplementationStatus

  if (!entryId || !status) {
    return { error: "Implementation status is required." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("lore_entries")
    .update({ implementation_status: status })
    .eq("id", entryId)

  if (error) {
    return { error: error.message }
  }

  revalidateLoreEntryPaths(slug, entrySlug)
  return { success: "Implementation status updated." }
}

export async function linkLoreDevelopment(
  _prevState: LoreDevelopmentActionState,
  formData: FormData
): Promise<LoreDevelopmentActionState> {
  const entryId = String(formData.get("entryId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")
  const linkType = String(formData.get("linkType") ?? "") as LoreDevelopmentLinkType
  const linkedId = String(formData.get("linkedId") ?? "")

  if (!entryId || !linkType || !linkedId) {
    return { error: "Select an item to link." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("lore_development_links").insert({
    entry_id: entryId,
    link_type: linkType,
    linked_id: linkedId,
  })

  if (error) {
    if (error.message.includes("lore_development_links_entry_id_link_type_linked_id_key")) {
      return { error: "Already linked." }
    }
    return { error: error.message }
  }

  revalidateLoreEntryPaths(slug, entrySlug)
  return { success: "Link added." }
}

export async function unlinkLoreDevelopment(
  _prevState: LoreDevelopmentActionState,
  formData: FormData
): Promise<LoreDevelopmentActionState> {
  const linkId = String(formData.get("linkId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")

  if (!linkId) {
    return { error: "Missing link." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("lore_development_links").delete().eq("id", linkId)

  if (error) {
    return { error: error.message }
  }

  revalidateLoreEntryPaths(slug, entrySlug)
  return { success: "Link removed." }
}

export async function unlinkLoreTask(
  _prevState: LoreDevelopmentActionState,
  formData: FormData
): Promise<LoreDevelopmentActionState> {
  const linkId = String(formData.get("linkId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")

  if (!linkId) {
    return { error: "Missing link." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("task_reference_links").delete().eq("id", linkId)

  if (error) {
    return { error: error.message }
  }

  revalidateLoreEntryPaths(slug, entrySlug)
  return { success: "Task unlinked." }
}

export async function createTaskFromLore(
  _prevState: LoreDevelopmentActionState,
  formData: FormData
): Promise<LoreDevelopmentActionState> {
  const projectId = String(formData.get("projectId") ?? "")
  const entryId = String(formData.get("entryId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")
  const entryName = String(formData.get("entryName") ?? "").trim()
  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const listId = String(formData.get("listId") ?? "")
  const milestoneId = String(formData.get("milestoneId") ?? "")
  const initiativeId = String(formData.get("initiativeId") ?? "")

  if (!projectId || !entryId || !title) {
    return { error: "Task title is required." }
  }

  const lists = await getProjectBoardLists(projectId)
  const resolvedListId = listId || lists[0]?.id

  if (!resolvedListId) {
    return { error: "Create a board list before adding tasks." }
  }

  const supabase = await createClient()
  const loreUrl = `/projects/${slug}/lore/${entrySlug}`
  const taskDescription =
    description ||
    `Implement lore: ${entryName}\n\nLore entry: ${loreUrl}`

  const { data: task, error } = await supabase.rpc("create_task", {
    p_project_id: projectId,
    p_title: title,
    p_description: taskDescription,
    p_status: "backlog",
    p_priority: "medium",
    p_assignee_id: null,
    p_discipline: "worldbuilding",
    p_due_date: null,
    p_list_id: resolvedListId,
  })

  if (error || !task) {
    return { error: error?.message ?? "Could not create task." }
  }

  if (milestoneId) {
    await supabase.from("tasks").update({ milestone_id: milestoneId }).eq("id", task.id)
  }

  if (initiativeId) {
    await supabase.from("tasks").update({ initiative_id: initiativeId }).eq("id", task.id)
  }

  const { error: linkError } = await supabase.from("task_reference_links").insert({
    task_id: task.id,
    reference_type: "lore_entry",
    reference_id: entryId,
  })

  if (linkError) {
    return { error: linkError.message }
  }

  await runTaskAutomationsForCreate(task.id)

  revalidateLoreEntryPaths(slug, entrySlug)
  return { success: `Task ${task.identifier} created.`, taskId: task.id }
}
