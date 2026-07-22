import { createClient } from "@/lib/supabase/server"
import type { LoreDevelopmentLinkType, TaskStatus } from "@/lib/database.types"

export type LoreLinkedTask = {
  id: string
  identifier: string
  title: string
  status: TaskStatus
  link_id: string
}

export type LoreLinkedAsset = {
  id: string
  name: string
  slug: string
  link_id: string
}

export type LoreLinkedInitiative = {
  id: string
  name: string
  slug: string
  link_id: string
}

export type LoreLinkedMilestone = {
  id: string
  name: string
  slug: string
  link_id: string
}

export type LoreDevelopmentConnections = {
  tasks: LoreLinkedTask[]
  assets: LoreLinkedAsset[]
  initiatives: LoreLinkedInitiative[]
  milestones: LoreLinkedMilestone[]
}

export type LoreDevelopmentOptions = {
  assets: Array<{ id: string; name: string; slug: string }>
  initiatives: Array<{ id: string; name: string; slug: string }>
  milestones: Array<{ id: string; name: string; slug: string }>
}

export async function getLoreDevelopmentConnections(
  entryId: string
): Promise<LoreDevelopmentConnections> {
  const supabase = await createClient()

  const [{ data: taskLinks }, { data: devLinks }] = await Promise.all([
    supabase
      .from("task_reference_links")
      .select("id, task_id")
      .eq("reference_type", "lore_entry")
      .eq("reference_id", entryId),
    supabase.from("lore_development_links").select("*").eq("entry_id", entryId),
  ])

  const taskIds = taskLinks?.map((link) => link.task_id) ?? []
  const { data: tasks } =
    taskIds.length > 0
      ? await supabase
          .from("tasks")
          .select("id, identifier, title, status")
          .in("id", taskIds)
          .is("deleted_at", null)
      : { data: [] as Array<{ id: string; identifier: string; title: string; status: TaskStatus }> }

  const taskLinkByTaskId = new Map(taskLinks?.map((link) => [link.task_id, link.id]) ?? [])

  const assetIds =
    devLinks?.filter((link) => link.link_type === "asset").map((link) => link.linked_id) ?? []
  const initiativeIds =
    devLinks?.filter((link) => link.link_type === "initiative").map((link) => link.linked_id) ?? []
  const milestoneIds =
    devLinks?.filter((link) => link.link_type === "milestone").map((link) => link.linked_id) ?? []

  const [{ data: assets }, { data: initiatives }, { data: milestones }] = await Promise.all([
    assetIds.length > 0
      ? supabase.from("assets").select("id, name, slug").in("id", assetIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; slug: string }> }),
    initiativeIds.length > 0
      ? supabase.from("initiatives").select("id, name, slug").in("id", initiativeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; slug: string }> }),
    milestoneIds.length > 0
      ? supabase.from("milestones").select("id, name, slug").in("id", milestoneIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; slug: string }> }),
  ])

  const devLinkId = (type: LoreDevelopmentLinkType, linkedId: string) =>
    devLinks?.find((link) => link.link_type === type && link.linked_id === linkedId)?.id ?? ""

  return {
    tasks:
      tasks?.map((task) => ({
        id: task.id,
        identifier: task.identifier,
        title: task.title,
        status: task.status,
        link_id: taskLinkByTaskId.get(task.id) ?? "",
      })) ?? [],
    assets:
      assets?.map((asset) => ({
        id: asset.id,
        name: asset.name,
        slug: asset.slug,
        link_id: devLinkId("asset", asset.id),
      })) ?? [],
    initiatives:
      initiatives?.map((initiative) => ({
        id: initiative.id,
        name: initiative.name,
        slug: initiative.slug,
        link_id: devLinkId("initiative", initiative.id),
      })) ?? [],
    milestones:
      milestones?.map((milestone) => ({
        id: milestone.id,
        name: milestone.name,
        slug: milestone.slug,
        link_id: devLinkId("milestone", milestone.id),
      })) ?? [],
  }
}

export async function getLoreDevelopmentOptions(projectId: string): Promise<LoreDevelopmentOptions> {
  const supabase = await createClient()

  const [{ data: assets }, { data: initiatives }, { data: milestones }] = await Promise.all([
    supabase
      .from("assets")
      .select("id, name, slug")
      .eq("project_id", projectId)
      .order("name"),
    supabase
      .from("initiatives")
      .select("id, name, slug")
      .eq("project_id", projectId)
      .neq("status", "cancelled")
      .order("name"),
    supabase
      .from("milestones")
      .select("id, name, slug")
      .eq("project_id", projectId)
      .neq("status", "cancelled")
      .order("name"),
  ])

  return {
    assets: assets ?? [],
    initiatives: initiatives ?? [],
    milestones: milestones ?? [],
  }
}
