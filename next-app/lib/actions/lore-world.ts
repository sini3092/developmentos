"use server"

import { revalidatePath } from "next/cache"

import type { LoreMapMarkerType, LoreTimelinePrecision } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils/format"

export type LoreWorldActionState = {
  error?: string
  success?: string
}

function revalidateWorldPaths(slug: string, extra?: string) {
  revalidatePath(`/projects/${slug}/lore`)
  revalidatePath(`/projects/${slug}/lore/timeline`)
  revalidatePath(`/projects/${slug}/lore/collections`)
  revalidatePath(`/projects/${slug}/lore/world`)
  revalidatePath(`/projects/${slug}/lore/map`)
  revalidatePath(`/projects/${slug}/lore/health`)
  if (extra) {
    revalidatePath(extra)
  }
}

export async function createLoreEra(
  _prevState: LoreWorldActionState,
  formData: FormData
): Promise<LoreWorldActionState> {
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const shortLabel = String(formData.get("shortLabel") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const sortOrder = Number(formData.get("sortOrder") ?? 0)

  if (!projectId || !name) {
    return { error: "Era name is required." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("lore_eras").insert({
    project_id: projectId,
    name,
    short_label: shortLabel || null,
    description: description || null,
    sort_order: Number.isFinite(sortOrder) ? sortOrder : 0,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateWorldPaths(slug)
  return { success: "Era created." }
}

export async function createLoreCollection(
  _prevState: LoreWorldActionState,
  formData: FormData
): Promise<LoreWorldActionState> {
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()

  if (!projectId || !name) {
    return { error: "Collection name is required." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("lore_collections").insert({
    project_id: projectId,
    name,
    slug: slugify(name),
    description: description || null,
    created_by: user?.id ?? null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateWorldPaths(slug)
  return { success: "Collection created." }
}

export async function addLoreCollectionEntry(
  _prevState: LoreWorldActionState,
  formData: FormData
): Promise<LoreWorldActionState> {
  const collectionId = String(formData.get("collectionId") ?? "")
  const entryId = String(formData.get("entryId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const collectionSlug = String(formData.get("collectionSlug") ?? "")

  if (!collectionId || !entryId) {
    return { error: "Select an entry to add." }
  }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from("lore_collection_entries")
    .select("position")
    .eq("collection_id", collectionId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle()

  const { error } = await supabase.from("lore_collection_entries").insert({
    collection_id: collectionId,
    entry_id: entryId,
    position: (existing?.position ?? -1) + 1,
  })

  if (error) {
    if (error.message.includes("lore_collection_entries_collection_id_entry_id_key")) {
      return { error: "Entry is already in this collection." }
    }
    return { error: error.message }
  }

  revalidateWorldPaths(slug, `/projects/${slug}/lore/collections/${collectionSlug}`)
  return { success: "Entry added to collection." }
}

export async function removeLoreCollectionEntry(
  _prevState: LoreWorldActionState,
  formData: FormData
): Promise<LoreWorldActionState> {
  const linkId = String(formData.get("linkId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const collectionSlug = String(formData.get("collectionSlug") ?? "")

  if (!linkId) {
    return { error: "Missing link." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("lore_collection_entries").delete().eq("id", linkId)

  if (error) {
    return { error: error.message }
  }

  revalidateWorldPaths(slug, `/projects/${slug}/lore/collections/${collectionSlug}`)
  return { success: "Entry removed." }
}

export async function createLoreWorldMap(
  _prevState: LoreWorldActionState,
  formData: FormData
): Promise<LoreWorldActionState> {
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const imageUrl = String(formData.get("imageUrl") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const isPrimary = formData.get("isPrimary") === "on"

  if (!projectId || !name || !imageUrl) {
    return { error: "Map name and image URL are required." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (isPrimary) {
    await supabase
      .from("lore_world_maps")
      .update({ is_primary: false })
      .eq("project_id", projectId)
  }

  const { error } = await supabase.from("lore_world_maps").insert({
    project_id: projectId,
    name,
    image_url: imageUrl,
    description: description || null,
    is_primary: isPrimary,
    created_by: user?.id ?? null,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateWorldPaths(slug)
  return { success: "World map added." }
}

export async function addLoreMapMarker(
  _prevState: LoreWorldActionState,
  formData: FormData
): Promise<LoreWorldActionState> {
  const mapId = String(formData.get("mapId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const label = String(formData.get("label") ?? "").trim()
  const entryId = String(formData.get("entryId") ?? "")
  const markerType = String(formData.get("markerType") ?? "landmark") as LoreMapMarkerType
  const xPercent = Number(formData.get("xPercent") ?? 50)
  const yPercent = Number(formData.get("yPercent") ?? 50)

  if (!mapId || !label) {
    return { error: "Marker label is required." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("lore_map_markers").insert({
    map_id: mapId,
    label,
    entry_id: entryId || null,
    marker_type: markerType,
    x_percent: xPercent,
    y_percent: yPercent,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateWorldPaths(slug)
  return { success: "Marker added." }
}

export async function removeLoreMapMarker(
  _prevState: LoreWorldActionState,
  formData: FormData
): Promise<LoreWorldActionState> {
  const markerId = String(formData.get("markerId") ?? "")
  const slug = String(formData.get("slug") ?? "")

  if (!markerId) {
    return { error: "Missing marker." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("lore_map_markers").delete().eq("id", markerId)

  if (error) {
    return { error: error.message }
  }

  revalidateWorldPaths(slug)
  return { success: "Marker removed." }
}

export async function updateLoreTimelineFields(
  _prevState: LoreWorldActionState,
  formData: FormData
): Promise<LoreWorldActionState> {
  const entryId = String(formData.get("entryId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")
  const timelineLabel = String(formData.get("timelineLabel") ?? "").trim()
  const timelineEndLabel = String(formData.get("timelineEndLabel") ?? "").trim()
  const timelineSortOrder = String(formData.get("timelineSortOrder") ?? "")
  const timelineEraId = String(formData.get("timelineEraId") ?? "")
  const timelinePrecision = String(formData.get("timelinePrecision") ?? "unknown") as LoreTimelinePrecision
  const parentEntryId = String(formData.get("parentEntryId") ?? "")

  if (!entryId) {
    return { error: "Missing entry." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("lore_entries")
    .update({
      timeline_label: timelineLabel || null,
      timeline_end_label: timelineEndLabel || null,
      timeline_sort_order: timelineSortOrder ? Number(timelineSortOrder) : null,
      timeline_era_id: timelineEraId || null,
      timeline_precision: timelinePrecision,
      parent_entry_id: parentEntryId || null,
    })
    .eq("id", entryId)

  if (error) {
    return { error: error.message }
  }

  revalidateWorldPaths(slug, `/projects/${slug}/lore/${entrySlug}`)
  return { success: "Timeline fields updated." }
}
