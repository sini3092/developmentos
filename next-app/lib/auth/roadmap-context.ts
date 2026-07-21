import { notFound } from "next/navigation"

import type {
  InitiativeDetail,
  InitiativeWithOwner,
  MilestoneWithOwner,
  Profile,
  TaskStatus,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { buildTaskBreakdown, isTaskComplete } from "@/lib/utils/roadmap"

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
      .select("id, initiative_id, status, progress, identifier, title, updated_at")
      .in("initiative_id", initiativeIds)
      .is("deleted_at", null)
      .neq("status", "cancelled"),
  ])

  const withOwners = await attachProfiles(initiatives)

  return withOwners.map((initiative) => {
    const linkedTasks = tasks?.filter((task) => task.initiative_id === initiative.id) ?? []
    const doneCount = linkedTasks.filter((task) => isTaskComplete(task.progress)).length
    const openCount = linkedTasks.length - doneCount
    const blockedCount = 0
    const breakdown = buildTaskBreakdown(linkedTasks)
    const recentTasks = [...linkedTasks]
      .sort((a, b) => {
        const aDone = isTaskComplete(a.progress) ? 1 : 0
        const bDone = isTaskComplete(b.progress) ? 1 : 0
        if (aDone !== bDone) return aDone - bDone
        return (b.progress ?? 0) - (a.progress ?? 0)
      })
      .slice(0, 3)
      .map((task) => ({
        id: task.id,
        identifier: task.identifier,
        title: task.title,
        status: task.status,
        progress: task.progress ?? 0,
      }))

    return {
      ...initiative,
      milestone_count:
        milestones?.filter((milestone) => milestone.initiative_id === initiative.id).length ??
        0,
      task_count: linkedTasks.length,
      task_done_count: doneCount,
      task_open_count: openCount,
      task_blocked_count: blockedCount,
      task_status_breakdown: breakdown,
      recent_tasks: recentTasks,
    }
  })
}

export async function getUnlinkedTaskCount(projectId: string) {
  const supabase = await createClient()

  const { count } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .is("initiative_id", null)
    .is("deleted_at", null)
    .neq("status", "cancelled")

  return count ?? 0
}

export type InitiativeLinkedTask = {
  id: string
  identifier: string
  title: string
  status: TaskStatus
  progress: number
  updated_at: string
}

export async function getInitiativeLinkedTasks(
  initiativeId: string
): Promise<InitiativeLinkedTask[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from("tasks")
    .select("id, identifier, title, status, progress, updated_at")
    .eq("initiative_id", initiativeId)
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .order("updated_at", { ascending: false })

  return data ?? []
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

  const [{ data: updates }, { data: milestones }, linkedTasks] = await Promise.all([
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
    getInitiativeLinkedTasks(initiative.id),
  ])

  const authorIds = [...new Set(updates?.map((update) => update.author_id) ?? [])]
  const { data: authors } =
    authorIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", authorIds)
      : { data: [] as Profile[] }

  const [withOwner] = await attachProfiles([initiative])

  const doneCount = linkedTasks.filter((task) => isTaskComplete(task.progress)).length
  const breakdown = buildTaskBreakdown(linkedTasks)

  return {
    ...withOwner,
    milestone_count: milestones?.length ?? 0,
    task_count: linkedTasks.length,
    task_done_count: doneCount,
    task_open_count: linkedTasks.length - doneCount,
    task_blocked_count: 0,
    task_status_breakdown: breakdown,
    linked_tasks: linkedTasks,
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
