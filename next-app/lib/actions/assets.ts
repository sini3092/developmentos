"use server"

import { revalidatePath } from "next/cache"

import type { AssetStatus, AssetType } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils/format"

export type AssetActionState = {
  error?: string
  success?: string
}

function revalidateAssetPaths(slug: string, assetSlug?: string) {
  revalidatePath(`/projects/${slug}/assets`)
  if (assetSlug) {
    revalidatePath(`/projects/${slug}/assets/${assetSlug}`)
  }
}

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export async function createAsset(
  _prevState: AssetActionState,
  formData: FormData
): Promise<AssetActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const assetSlugInput = String(formData.get("assetSlug") ?? "").trim()
  const assetType = String(formData.get("assetType") ?? "other") as AssetType
  const status = String(formData.get("status") ?? "concept") as AssetStatus
  const description = String(formData.get("description") ?? "").trim()
  const version = String(formData.get("version") ?? "0.1").trim() || "0.1"
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null
  const tags = parseTags(String(formData.get("tags") ?? ""))

  if (!workspaceId || !projectId || !name) {
    return { error: "Asset name is required." }
  }

  const assetSlug = assetSlugInput || slugify(name)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(assetSlug)) {
    return { error: "Slug must use lowercase letters, numbers, and hyphens." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { error } = await supabase.from("assets").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    name,
    slug: assetSlug,
    asset_type: assetType,
    status,
    description: description || null,
    version,
    owner_id: ownerId,
    tags,
    created_by: user.id,
  })

  if (error) {
    if (error.message.includes("assets_project_id_slug_key")) {
      return { error: "An asset with this slug already exists." }
    }
    return { error: error.message }
  }

  revalidateAssetPaths(slug, assetSlug)
  return { success: "Asset created." }
}

export async function updateAsset(
  _prevState: AssetActionState,
  formData: FormData
): Promise<AssetActionState> {
  const assetId = String(formData.get("assetId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const assetSlug = String(formData.get("assetSlug") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const assetType = String(formData.get("assetType") ?? "other") as AssetType
  const status = String(formData.get("status") ?? "concept") as AssetStatus
  const description = String(formData.get("description") ?? "").trim()
  const version = String(formData.get("version") ?? "0.1").trim() || "0.1"
  const ownerId = String(formData.get("ownerId") ?? "").trim() || null
  const sourcePath = String(formData.get("sourcePath") ?? "").trim() || null
  const exportPath = String(formData.get("exportPath") ?? "").trim() || null
  const enginePath = String(formData.get("enginePath") ?? "").trim() || null
  const previewUrl = String(formData.get("previewUrl") ?? "").trim() || null
  const tags = parseTags(String(formData.get("tags") ?? ""))

  if (!assetId || !name) {
    return { error: "Asset name is required." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("assets")
    .update({
      name,
      asset_type: assetType,
      status,
      description: description || null,
      version,
      owner_id: ownerId,
      source_path: sourcePath,
      export_path: exportPath,
      engine_path: enginePath,
      preview_url: previewUrl,
      tags,
    })
    .eq("id", assetId)

  if (error) {
    return { error: error.message }
  }

  revalidateAssetPaths(slug, assetSlug)
  return { success: "Asset updated." }
}

export async function linkAssetTask(
  _prevState: AssetActionState,
  formData: FormData
): Promise<AssetActionState> {
  const assetId = String(formData.get("assetId") ?? "")
  const taskId = String(formData.get("taskId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const assetSlug = String(formData.get("assetSlug") ?? "")

  if (!assetId || !taskId) {
    return { error: "Select a task to link." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("asset_task_links").insert({
    asset_id: assetId,
    task_id: taskId,
  })

  if (error) {
    if (error.message.includes("asset_task_links_pkey")) {
      return { error: "Task is already linked." }
    }
    return { error: error.message }
  }

  revalidateAssetPaths(slug, assetSlug)
  return { success: "Task linked." }
}

export async function unlinkAssetTask(
  _prevState: AssetActionState,
  formData: FormData
): Promise<AssetActionState> {
  const assetId = String(formData.get("assetId") ?? "")
  const taskId = String(formData.get("taskId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const assetSlug = String(formData.get("assetSlug") ?? "")

  if (!assetId || !taskId) {
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

  revalidateAssetPaths(slug, assetSlug)
  return { success: "Task unlinked." }
}

export async function seedStarterAssets(
  _prevState: AssetActionState,
  formData: FormData
): Promise<AssetActionState> {
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")

  if (!projectId) {
    return { error: "Project is required." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("seed_starter_assets", {
    p_project_id: projectId,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateAssetPaths(slug)
  return { success: `Added ${data ?? 0} starter assets.` }
}
