import type { LoreEntryType } from "@/lib/database.types"
import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import { getLoreSectionTemplates } from "@/lib/constants/lore-section-templates"

type Client = SupabaseClient<Database>

export type LoreSectionRow = Database["public"]["Tables"]["lore_sections"]["Row"]

export async function getLoreSectionsForEntry(
  supabase: Client,
  entryId: string
): Promise<LoreSectionRow[]> {
  const { data } = await supabase
    .from("lore_sections")
    .select("*")
    .eq("entry_id", entryId)
    .order("position", { ascending: true })

  return data ?? []
}

export async function ensureLoreSectionsForEntry(
  supabase: Client,
  entryId: string,
  entryType: LoreEntryType,
  seedContent?: string | null
) {
  const existing = await getLoreSectionsForEntry(supabase, entryId)
  if (existing.length > 0) {
    return existing
  }

  const templates = getLoreSectionTemplates(entryType)
  const rows = templates.map((template, index) => ({
    entry_id: entryId,
    section_key: template.key,
    title: template.title,
    content:
      template.key === "overview" && seedContent?.trim()
        ? seedContent.trim()
        : "",
    position: (index + 1) * 1000,
  }))

  const { data, error } = await supabase.from("lore_sections").insert(rows).select("*")

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function syncLoreSectionTemplates(
  supabase: Client,
  entryId: string,
  entryType: LoreEntryType
) {
  const existing = await getLoreSectionsForEntry(supabase, entryId)
  const existingKeys = new Set(existing.map((section) => section.section_key))
  const templates = getLoreSectionTemplates(entryType)
  const missing = templates.filter((template) => !existingKeys.has(template.key))

  if (missing.length === 0) {
    return existing
  }

  const startPosition = existing.length > 0 ? Math.max(...existing.map((s) => s.position)) : 0
  const rows = missing.map((template, index) => ({
    entry_id: entryId,
    section_key: template.key,
    title: template.title,
    content: "",
    position: startPosition + (index + 1) * 1000,
  }))

  const { data, error } = await supabase.from("lore_sections").insert(rows).select("*")

  if (error) {
    throw new Error(error.message)
  }

  return [...existing, ...(data ?? [])].sort((a, b) => a.position - b.position)
}
