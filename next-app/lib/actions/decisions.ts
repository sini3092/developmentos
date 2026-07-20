"use server"

import { revalidatePath } from "next/cache"

import type { DecisionLinkType, DecisionStatus } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils/format"

export type DecisionActionState = {
  error?: string
  success?: string
}

function revalidateDecisionPaths(slug: string, decisionSlug?: string) {
  revalidatePath(`/projects/${slug}/decisions`)
  if (decisionSlug) {
    revalidatePath(`/projects/${slug}/decisions/${decisionSlug}`)
  }
}

export async function createDecision(
  _prevState: DecisionActionState,
  formData: FormData
): Promise<DecisionActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  const decisionSlugInput = String(formData.get("decisionSlug") ?? "").trim()
  const status = String(formData.get("status") ?? "proposed") as DecisionStatus
  const context = String(formData.get("context") ?? "").trim()
  const problem = String(formData.get("problem") ?? "").trim()
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null

  if (!workspaceId || !projectId || !title) {
    return { error: "Decision title is required." }
  }

  const decisionSlug = decisionSlugInput || slugify(title)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(decisionSlug)) {
    return { error: "Slug must use lowercase letters, numbers, and hyphens." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { error } = await supabase.from("decisions").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    title,
    slug: decisionSlug,
    status,
    context,
    problem,
    owner_id: ownerId,
    created_by: user.id,
  })

  if (error) {
    if (error.message.includes("decisions_project_id_slug_key")) {
      return { error: "A decision with this slug already exists." }
    }
    return { error: error.message }
  }

  revalidateDecisionPaths(slug, decisionSlug)
  return { success: "Decision created." }
}

export async function updateDecision(
  _prevState: DecisionActionState,
  formData: FormData
): Promise<DecisionActionState> {
  const decisionId = String(formData.get("decisionId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const decisionSlug = String(formData.get("decisionSlug") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  const status = String(formData.get("status") ?? "proposed") as DecisionStatus
  const context = String(formData.get("context") ?? "").trim()
  const problem = String(formData.get("problem") ?? "").trim()
  const options = String(formData.get("options") ?? "").trim()
  const selectedOption = String(formData.get("selectedOption") ?? "").trim() || null
  const reasoning = String(formData.get("reasoning") ?? "").trim() || null
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null

  if (!decisionId || !title) {
    return { error: "Decision title is required." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("decisions")
    .update({
      title,
      status,
      context,
      problem,
      options,
      selected_option: selectedOption,
      reasoning,
      owner_id: ownerId,
    })
    .eq("id", decisionId)

  if (error) {
    return { error: error.message }
  }

  revalidateDecisionPaths(slug, decisionSlug)
  return { success: "Decision updated." }
}

export async function linkDecisionItem(
  _prevState: DecisionActionState,
  formData: FormData
): Promise<DecisionActionState> {
  const decisionId = String(formData.get("decisionId") ?? "")
  const linkType = String(formData.get("linkType") ?? "") as DecisionLinkType
  const linkedId = String(formData.get("linkedId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const decisionSlug = String(formData.get("decisionSlug") ?? "")

  if (!decisionId || !linkType || !linkedId) {
    return { error: "Select an item to link." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("decision_links").insert({
    decision_id: decisionId,
    link_type: linkType,
    linked_id: linkedId,
  })

  if (error) {
    if (error.message.includes("decision_links_decision_id_link_type_linked_id_key")) {
      return { error: "Item is already linked." }
    }
    return { error: error.message }
  }

  revalidateDecisionPaths(slug, decisionSlug)
  return { success: "Link added." }
}

export async function unlinkDecisionItem(
  _prevState: DecisionActionState,
  formData: FormData
): Promise<DecisionActionState> {
  const linkId = String(formData.get("linkId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const decisionSlug = String(formData.get("decisionSlug") ?? "")

  if (!linkId) {
    return { error: "Missing link." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("decision_links").delete().eq("id", linkId)

  if (error) {
    return { error: error.message }
  }

  revalidateDecisionPaths(slug, decisionSlug)
  return { success: "Link removed." }
}

export async function seedStarterDecisions(
  _prevState: DecisionActionState,
  formData: FormData
): Promise<DecisionActionState> {
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")

  if (!projectId) {
    return { error: "Project is required." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("seed_starter_decisions", {
    p_project_id: projectId,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateDecisionPaths(slug)
  return { success: `Added ${data ?? 0} starter decisions.` }
}
