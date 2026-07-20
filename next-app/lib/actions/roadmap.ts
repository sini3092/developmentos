"use server"

import { revalidatePath } from "next/cache"

import type {
  InitiativeHealth,
  InitiativePriority,
  InitiativeStatus,
  MilestoneStatus,
  PlanningHorizon,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils/format"

export type RoadmapActionState = {
  error?: string
  success?: string
}

function revalidateRoadmapPaths(slug: string, initiativeSlug?: string) {
  revalidatePath(`/projects/${slug}`)
  revalidatePath(`/projects/${slug}/roadmap`)
  revalidatePath(`/projects/${slug}/milestones`)
  if (initiativeSlug) {
    revalidatePath(`/projects/${slug}/roadmap/${initiativeSlug}`)
  }
}

export async function createInitiative(
  _prevState: RoadmapActionState,
  formData: FormData
): Promise<RoadmapActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const summary = String(formData.get("summary") ?? "").trim()
  const initiativeSlugInput = String(formData.get("initiativeSlug") ?? "").trim()
  const planningHorizon = String(
    formData.get("planningHorizon") ?? "later"
  ) as PlanningHorizon
  const status = String(formData.get("status") ?? "idea") as InitiativeStatus
  const priority = String(formData.get("priority") ?? "medium") as InitiativePriority
  const ownerId = String(formData.get("ownerId") ?? "")
  const targetStart = String(formData.get("targetStart") ?? "")
  const targetCompletion = String(formData.get("targetCompletion") ?? "")

  if (!workspaceId || !projectId || !name) {
    return { error: "Initiative name is required." }
  }

  const initiativeSlug = initiativeSlugInput || slugify(name)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(initiativeSlug)) {
    return { error: "Slug must use lowercase letters, numbers, and hyphens." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { error } = await supabase.from("initiatives").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    name,
    slug: initiativeSlug,
    summary: summary || null,
    planning_horizon: planningHorizon,
    status,
    priority,
    owner_id: ownerId || user.id,
    created_by: user.id,
    target_start: targetStart || null,
    target_completion: targetCompletion || null,
  })

  if (error) {
    if (error.message.includes("initiatives_project_id_slug_key")) {
      return { error: "An initiative with this slug already exists." }
    }
    return { error: error.message }
  }

  revalidateRoadmapPaths(slug)
  return { success: "Initiative created." }
}

export async function updateInitiative(
  _prevState: RoadmapActionState,
  formData: FormData
): Promise<RoadmapActionState> {
  const initiativeId = String(formData.get("initiativeId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const initiativeSlug = String(formData.get("initiativeSlug") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const summary = String(formData.get("summary") ?? "").trim()
  const planningHorizon = String(
    formData.get("planningHorizon") ?? "later"
  ) as PlanningHorizon
  const status = String(formData.get("status") ?? "idea") as InitiativeStatus
  const priority = String(formData.get("priority") ?? "medium") as InitiativePriority
  const health = String(formData.get("health") ?? "no_status") as InitiativeHealth
  const progress = Number(formData.get("progress") ?? 0)
  const ownerId = String(formData.get("ownerId") ?? "")
  const targetStart = String(formData.get("targetStart") ?? "")
  const targetCompletion = String(formData.get("targetCompletion") ?? "")

  if (!initiativeId || !name) {
    return { error: "Initiative name is required." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("initiatives")
    .update({
      name,
      summary: summary || null,
      planning_horizon: planningHorizon,
      status,
      priority,
      health,
      progress: Math.min(100, Math.max(0, progress)),
      owner_id: ownerId || null,
      target_start: targetStart || null,
      target_completion: targetCompletion || null,
    })
    .eq("id", initiativeId)

  if (error) {
    return { error: error.message }
  }

  revalidateRoadmapPaths(slug, initiativeSlug)
  return { success: "Initiative updated." }
}

export async function postInitiativeUpdate(
  _prevState: RoadmapActionState,
  formData: FormData
): Promise<RoadmapActionState> {
  const initiativeId = String(formData.get("initiativeId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const initiativeSlug = String(formData.get("initiativeSlug") ?? "")
  const health = String(formData.get("health") ?? "no_status") as InitiativeHealth
  const progress = Number(formData.get("progress") ?? 0)
  const summary = String(formData.get("summary") ?? "").trim()
  const accomplishments = String(formData.get("accomplishments") ?? "").trim()
  const blockers = String(formData.get("blockers") ?? "").trim()
  const nextSteps = String(formData.get("nextSteps") ?? "").trim()

  if (!initiativeId || !summary) {
    return { error: "Update summary is required." }
  }

  const supabase = await createClient()
  const { error } = await supabase.rpc("post_initiative_update", {
    p_initiative_id: initiativeId,
    p_health: health,
    p_progress: Math.min(100, Math.max(0, progress)),
    p_summary: summary,
    p_accomplishments: accomplishments || null,
    p_blockers: blockers || null,
    p_next_steps: nextSteps || null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateRoadmapPaths(slug, initiativeSlug)
  return { success: "Update posted." }
}

export async function seedStarterInitiatives(projectId: string, slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("seed_starter_initiatives", {
    p_project_id: projectId,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateRoadmapPaths(slug)
  return { success: `Created ${data ?? 0} starter initiatives.` }
}

export async function createMilestone(
  _prevState: RoadmapActionState,
  formData: FormData
): Promise<RoadmapActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const milestoneSlugInput = String(formData.get("milestoneSlug") ?? "").trim()
  const initiativeId = String(formData.get("initiativeId") ?? "")
  const status = String(formData.get("status") ?? "draft") as MilestoneStatus
  const ownerId = String(formData.get("ownerId") ?? "")
  const targetStart = String(formData.get("targetStart") ?? "")
  const targetDate = String(formData.get("targetDate") ?? "")

  if (!workspaceId || !projectId || !name) {
    return { error: "Milestone name is required." }
  }

  const milestoneSlug = milestoneSlugInput || slugify(name)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(milestoneSlug)) {
    return { error: "Slug must use lowercase letters, numbers, and hyphens." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { error } = await supabase.from("milestones").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    name,
    slug: milestoneSlug,
    description: description || null,
    initiative_id: initiativeId || null,
    status,
    owner_id: ownerId || user.id,
    created_by: user.id,
    target_start: targetStart || null,
    target_date: targetDate || null,
  })

  if (error) {
    if (error.message.includes("milestones_project_id_slug_key")) {
      return { error: "A milestone with this slug already exists." }
    }
    return { error: error.message }
  }

  revalidateRoadmapPaths(slug)
  return { success: "Milestone created." }
}

export async function postMilestoneUpdate(
  _prevState: RoadmapActionState,
  formData: FormData
): Promise<RoadmapActionState> {
  const milestoneId = String(formData.get("milestoneId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const health = String(formData.get("health") ?? "no_status") as InitiativeHealth
  const progress = Number(formData.get("progress") ?? 0)
  const summary = String(formData.get("summary") ?? "").trim()
  const accomplishments = String(formData.get("accomplishments") ?? "").trim()
  const blockers = String(formData.get("blockers") ?? "").trim()
  const nextSteps = String(formData.get("nextSteps") ?? "").trim()

  if (!milestoneId || !summary) {
    return { error: "Update summary is required." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const clampedProgress = Math.min(100, Math.max(0, progress))

  const { error: insertError } = await supabase.from("milestone_updates").insert({
    milestone_id: milestoneId,
    author_id: user.id,
    health,
    progress: clampedProgress,
    summary,
    accomplishments: accomplishments || null,
    blockers: blockers || null,
    next_steps: nextSteps || null,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  const { error: updateError } = await supabase
    .from("milestones")
    .update({ health, progress: clampedProgress })
    .eq("id", milestoneId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidateRoadmapPaths(slug)
  return { success: "Milestone update posted." }
}
