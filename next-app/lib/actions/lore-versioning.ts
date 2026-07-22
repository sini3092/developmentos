"use server"

import { revalidatePath } from "next/cache"

import type { LoreChangeType } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export type LoreVersioningActionState = {
  error?: string
  success?: string
}

function revalidateLoreEntryPaths(slug: string, entrySlug: string) {
  revalidatePath(`/projects/${slug}/lore/${entrySlug}`)
  revalidatePath(`/projects/${slug}/lore/${entrySlug}/edit`)
  revalidatePath(`/projects/${slug}/lore/${entrySlug}/versions`)
  revalidatePath(`/projects/${slug}/lore/browse`)
}

export async function retconLoreEntry(
  _prevState: LoreVersioningActionState,
  formData: FormData
): Promise<LoreVersioningActionState> {
  const entryId = String(formData.get("entryId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")
  const reason = String(formData.get("reason") ?? "").trim()
  const replacementEntryId = String(formData.get("replacementEntryId") ?? "").trim()

  if (!entryId || !reason) {
    return { error: "A retcon reason is required." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { data: entry } = await supabase
    .from("lore_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle()

  if (!entry) {
    return { error: "Lore entry not found." }
  }

  if (entry.canon_status !== "canon") {
    return { error: "Only canon entries can be retconned." }
  }

  if (replacementEntryId) {
    const { data: replacement } = await supabase
      .from("lore_entries")
      .select("id")
      .eq("id", replacementEntryId)
      .eq("project_id", entry.project_id)
      .maybeSingle()

    if (!replacement) {
      return { error: "Replacement entry must belong to the same project." }
    }
  }

  const { data: latestVersion } = await supabase
    .from("lore_entry_versions")
    .select("version_number")
    .eq("entry_id", entryId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  const versionNumber = (latestVersion?.version_number ?? 0) + 1

  await supabase.from("lore_entry_versions").insert({
    entry_id: entry.id,
    version_number: versionNumber,
    name: entry.name,
    summary: entry.summary,
    content: entry.content,
    content_json: entry.content_json,
    content_format: entry.content_format,
    entry_type: entry.entry_type,
    canon_status: entry.canon_status,
    change_summary: reason,
    change_type: "retcon" satisfies LoreChangeType,
    created_by: user.id,
  })

  const { error } = await supabase
    .from("lore_entries")
    .update({
      canon_status: "retconned",
      retcon_reason: reason,
      retconned_at: new Date().toISOString(),
      retconned_by: user.id,
      replacement_entry_id: replacementEntryId || null,
      change_summary: reason,
    })
    .eq("id", entryId)

  if (error) {
    return { error: error.message }
  }

  revalidateLoreEntryPaths(slug, entrySlug)
  return { success: "Entry marked as retconned. Previous canon snapshot saved in version history." }
}
