import { notFound } from "next/navigation"

import type { AssetDetail, AssetWithOwner, Profile, Task } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

async function attachOwners<T extends { owner_id: string | null }>(
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

export async function getAssets(projectId: string): Promise<AssetWithOwner[]> {
  const supabase = await createClient()

  const { data: assets } = await supabase
    .from("assets")
    .select("*")
    .eq("project_id", projectId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })

  return attachOwners(assets ?? [])
}

export async function getAsset(projectId: string, assetSlug: string): Promise<AssetDetail | null> {
  const supabase = await createClient()

  const { data: asset } = await supabase
    .from("assets")
    .select("*")
    .eq("project_id", projectId)
    .eq("slug", assetSlug)
    .maybeSingle()

  if (!asset) {
    return null
  }

  const [withOwner] = await attachOwners([asset])

  const { data: linkRows } = await supabase
    .from("asset_task_links")
    .select("task_id")
    .eq("asset_id", asset.id)

  const taskIds = linkRows?.map((row) => row.task_id) ?? []
  const { data: tasks } =
    taskIds.length > 0
      ? await supabase
          .from("tasks")
          .select("id, title, identifier")
          .in("id", taskIds)
          .is("deleted_at", null)
      : { data: [] as Array<Pick<Task, "id" | "title" | "identifier">> }

  return {
    ...withOwner,
    linked_tasks: tasks ?? [],
  }
}

export async function requireAsset(projectId: string, assetSlug: string): Promise<AssetDetail> {
  const asset = await getAsset(projectId, assetSlug)
  if (!asset) {
    notFound()
  }
  return asset
}
