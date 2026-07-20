"use server"

import { revalidatePath } from "next/cache"

import type { TaskReferenceType } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export type TaskConnectionActionState = {
  error?: string
  success?: string
}

function revalidateTaskPaths(slug: string) {
  revalidatePath(`/projects/${slug}/tasks`)
  revalidatePath(`/projects/${slug}/tasks/board`)
  revalidatePath(`/projects/${slug}/tasks/table`)
}

export async function linkTaskAsset(
  _prevState: TaskConnectionActionState,
  formData: FormData
): Promise<TaskConnectionActionState> {
  const taskId = String(formData.get("taskId") ?? "")
  const assetId = String(formData.get("assetId") ?? "")
  const slug = String(formData.get("slug") ?? "")

  if (!taskId || !assetId) {
    return { error: "Select an asset to link." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("asset_task_links").insert({
    asset_id: assetId,
    task_id: taskId,
  })

  if (error) {
    if (error.message.includes("asset_task_links_pkey")) {
      return { error: "Asset is already linked." }
    }
    return { error: error.message }
  }

  revalidateTaskPaths(slug)
  return { success: "Asset linked." }
}

export async function unlinkTaskAsset(
  _prevState: TaskConnectionActionState,
  formData: FormData
): Promise<TaskConnectionActionState> {
  const taskId = String(formData.get("taskId") ?? "")
  const assetId = String(formData.get("assetId") ?? "")
  const slug = String(formData.get("slug") ?? "")

  if (!taskId || !assetId) {
    return { error: "Missing link." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("asset_task_links")
    .delete()
    .eq("asset_id", assetId)
    .eq("task_id", taskId)

  if (error) {
    return { error: error.message }
  }

  revalidateTaskPaths(slug)
  return { success: "Asset unlinked." }
}

export async function linkTaskDecision(
  _prevState: TaskConnectionActionState,
  formData: FormData
): Promise<TaskConnectionActionState> {
  const taskId = String(formData.get("taskId") ?? "")
  const decisionId = String(formData.get("decisionId") ?? "")
  const slug = String(formData.get("slug") ?? "")

  if (!taskId || !decisionId) {
    return { error: "Select a decision to link." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("decision_links").insert({
    decision_id: decisionId,
    link_type: "task",
    linked_id: taskId,
  })

  if (error) {
    if (error.message.includes("decision_links_decision_id_link_type_linked_id_key")) {
      return { error: "Decision is already linked." }
    }
    return { error: error.message }
  }

  revalidateTaskPaths(slug)
  return { success: "Decision linked." }
}

export async function unlinkTaskDecision(
  _prevState: TaskConnectionActionState,
  formData: FormData
): Promise<TaskConnectionActionState> {
  const linkId = String(formData.get("linkId") ?? "")
  const slug = String(formData.get("slug") ?? "")

  if (!linkId) {
    return { error: "Missing link." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("decision_links").delete().eq("id", linkId)

  if (error) {
    return { error: error.message }
  }

  revalidateTaskPaths(slug)
  return { success: "Decision unlinked." }
}

export async function linkTaskReference(
  _prevState: TaskConnectionActionState,
  formData: FormData
): Promise<TaskConnectionActionState> {
  const taskId = String(formData.get("taskId") ?? "")
  const referenceType = String(formData.get("referenceType") ?? "") as TaskReferenceType
  const referenceId = String(formData.get("referenceId") ?? "")
  const slug = String(formData.get("slug") ?? "")

  if (!taskId || !referenceType || !referenceId) {
    return { error: "Select an item to link." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("task_reference_links").insert({
    task_id: taskId,
    reference_type: referenceType,
    reference_id: referenceId,
  })

  if (error) {
    if (error.message.includes("task_reference_links_task_id_reference_type_reference_id_key")) {
      return { error: "Item is already linked." }
    }
    return { error: error.message }
  }

  revalidateTaskPaths(slug)
  return { success: "Reference linked." }
}

export async function unlinkTaskReference(
  _prevState: TaskConnectionActionState,
  formData: FormData
): Promise<TaskConnectionActionState> {
  const linkId = String(formData.get("linkId") ?? "")
  const slug = String(formData.get("slug") ?? "")

  if (!linkId) {
    return { error: "Missing link." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("task_reference_links").delete().eq("id", linkId)

  if (error) {
    return { error: error.message }
  }

  revalidateTaskPaths(slug)
  return { success: "Reference unlinked." }
}
