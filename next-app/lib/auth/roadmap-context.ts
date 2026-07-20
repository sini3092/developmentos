import { notFound } from "next/navigation"

import type {
  InitiativeDetail,
  InitiativeWithOwner,
  MilestoneWithOwner,
  Profile,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export type RoadmapStats = {
  initiatives: number
  active: number
  atRisk: number
  milestones: number
}

async function attachProfiles<T extends { owner_id: string | null }>(
  rows: T[]
): Promise<Array<T & { owner: Profile | null }>> {
  if (rows.length === 0) {
    return []
  }

  const supabase = await createClient()
  const ownerIds = [...new Set(rows.map((row) => row.owner_id).filter(Boolean))] as string[]
  const { data: profiles } =
    ownerIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", ownerIds)
      : { data: [] as Profile[] }

  return rows.map((row) => ({
    ...row,
    owner: profiles?.find((profile) => profile.id === row.owner_id) ?? null,
  }))
}

export async function getRoadmapStats(projectId: string): Promise<RoadmapStats> {
  const supabase = await createClient()

  const [{ count: initiativeCount }, { data: initiatives }, { count: milestoneCount }] =
    await Promise.all([
      supabase
        .from("initiatives")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .neq("status", "cancelled"),
      supabase
        .from("initiatives")
        .select("status, health")
        .eq("project_id", projectId)
        .neq("status", "cancelled"),
      supabase
        .from("milestones")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .neq("status", "cancelled"),
    ])

  const active =
    initiatives?.filter((initiative) => initiative.status === "active").length ?? 0
  const atRisk =
    initiatives?.filter((initiative) => initiative.health === "at_risk").length ?? 0

  return {
    initiatives: initiativeCount ?? 0,
    active,
    atRisk,
    milestones: milestoneCount ?? 0,
  }
}

export async function getProjectInitiatives(
  projectId: string
): Promise<InitiativeWithOwner[]> {
  const supabase = await createClient()

  const { data: initiatives } = await supabase
    .from("initiatives")
    .select("*")
    .eq("project_id", projectId)
    .neq("status", "cancelled")
    .order("planning_horizon")
    .order("updated_at", { ascending: false })

  if (!initiatives?.length) {
    return []
  }

  const initiativeIds = initiatives.map((initiative) => initiative.id)
  const [{ data: milestones }, { data: tasks }] = await Promise.all([
    supabase.from("milestones").select("id, initiative_id").in("initiative_id", initiativeIds),
    supabase
      .from("tasks")
      .select("id, initiative_id, status, progress")
      .in("initiative_id", initiativeIds)
      .is("deleted_at", null)
      .neq("status", "cancelled"),
  ])

  const withOwners = await attachProfiles(initiatives)

  return withOwners.map((initiative) => {
    const linkedTasks = tasks?.filter((task) => task.initiative_id === initiative.id) ?? []
    const doneCount = linkedTasks.filter((task) => task.status === "done").length
    const openCount = linkedTasks.length - doneCount

    return {
      ...initiative,
      milestone_count:
        milestones?.filter((milestone) => milestone.initiative_id === initiative.id).length ??
        0,
      task_count: linkedTasks.length,
      task_done_count: doneCount,
      task_open_count: openCount,
    }
  })
}

export async function getInitiativeDetail(
  projectId: string,
  initiativeSlug: string
): Promise<InitiativeDetail | null> {
  const supabase = await createClient()

  const { data: initiative } = await supabase
    .from("initiatives")
    .select("*")
    .eq("project_id", projectId)
    .eq("slug", initiativeSlug)
    .maybeSingle()

  if (!initiative) {
    return null
  }

  const [{ data: updates }, { data: milestones }, { count: taskCount }] = await Promise.all([
    supabase
      .from("initiative_updates")
      .select("*")
      .eq("initiative_id", initiative.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("milestones")
      .select("*")
      .eq("initiative_id", initiative.id)
      .neq("status", "cancelled")
      .order("target_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("initiative_id", initiative.id)
      .is("deleted_at", null),
  ])

  const authorIds = [...new Set(updates?.map((update) => update.author_id) ?? [])]
  const { data: authors } =
    authorIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", authorIds)
      : { data: [] as Profile[] }

  const [withOwner] = await attachProfiles([initiative])

  return {
    ...withOwner,
    milestone_count: milestones?.length ?? 0,
    task_count: taskCount ?? 0,
    updates:
      updates?.map((update) => ({
        ...update,
        author: authors?.find((author) => author.id === update.author_id) ?? null,
      })) ?? [],
    milestones: milestones ?? [],
  }
}

export async function requireInitiative(projectId: string, initiativeSlug: string) {
  const initiative = await getInitiativeDetail(projectId, initiativeSlug)

  if (!initiative) {
    notFound()
  }

  return initiative
}

export async function getProjectMilestones(
  projectId: string
): Promise<MilestoneWithOwner[]> {
  const supabase = await createClient()

  const { data: milestones } = await supabase
    .from("milestones")
    .select("*")
    .eq("project_id", projectId)
    .neq("status", "cancelled")
    .order("target_date", { ascending: true, nullsFirst: false })

  if (!milestones?.length) {
    return []
  }

  const initiativeIds = [
    ...new Set(milestones.map((milestone) => milestone.initiative_id).filter(Boolean)),
  ] as string[]

  const [{ data: initiatives }, { data: tasks }] = await Promise.all([
    initiativeIds.length > 0
      ? supabase.from("initiatives").select("id, name, slug").in("id", initiativeIds)
      : { data: [] },
    supabase
      .from("tasks")
      .select("id, milestone_id")
      .in(
        "milestone_id",
        milestones.map((milestone) => milestone.id)
      )
      .is("deleted_at", null),
  ])

  const withOwners = await attachProfiles(milestones)

  return withOwners.map((milestone) => ({
    ...milestone,
    initiative:
      initiatives?.find((initiative) => initiative.id === milestone.initiative_id) ?? null,
    task_count:
      tasks?.filter((task) => task.milestone_id === milestone.id).length ?? 0,
  }))
}
