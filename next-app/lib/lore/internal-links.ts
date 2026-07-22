import type { LoreEntryType } from "@/lib/database.types"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/database.types"
import { slugify } from "@/lib/utils/format"

type Client = SupabaseClient<Database>

export type LoreLinkTarget = {
  id: string
  slug: string
  name: string
  summary: string | null
  entry_type: LoreEntryType
}

export type LoreLinkIndex = {
  bySlug: Map<string, LoreLinkTarget>
  byName: Map<string, LoreLinkTarget>
}

const WIKI_LINK_PATTERN = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g

export function buildLoreLinkIndex(entries: LoreLinkTarget[]): LoreLinkIndex {
  const bySlug = new Map<string, LoreLinkTarget>()
  const byName = new Map<string, LoreLinkTarget>()

  for (const entry of entries) {
    bySlug.set(entry.slug.toLowerCase(), entry)
    byName.set(entry.name.toLowerCase(), entry)
  }

  return { bySlug, byName }
}

export function parseWikiLinkToken(token: string): { label: string; slugHint: string | null } {
  const pipeIndex = token.indexOf("|")
  if (pipeIndex >= 0) {
    return {
      label: token.slice(0, pipeIndex).trim(),
      slugHint: token.slice(pipeIndex + 1).trim() || null,
    }
  }

  return { label: token.trim(), slugHint: null }
}

export function resolveWikiLinkToken(
  token: string,
  index: LoreLinkIndex
): LoreLinkTarget | null {
  const { label, slugHint } = parseWikiLinkToken(token)

  if (slugHint) {
    return index.bySlug.get(slugHint.toLowerCase()) ?? null
  }

  const bySlug = index.bySlug.get(slugify(label))
  if (bySlug) {
    return bySlug
  }

  return index.byName.get(label.toLowerCase()) ?? null
}

export function extractWikiLinkTokens(...texts: string[]): string[] {
  const tokens = new Set<string>()

  for (const text of texts) {
    if (!text) continue
    for (const match of text.matchAll(WIKI_LINK_PATTERN)) {
      tokens.add(match[0].slice(2, -2))
    }
  }

  return Array.from(tokens)
}

export function extractWikiLinkSlugs(...texts: string[]): string[] {
  const slugs = new Set<string>()

  for (const token of extractWikiLinkTokens(...texts)) {
    const { label, slugHint } = parseWikiLinkToken(token)
    slugs.add((slugHint ? slugify(slugHint) : slugify(label)).toLowerCase())
  }

  return Array.from(slugs)
}

export function resolveWikiLinksFromTexts(
  texts: string[],
  index: LoreLinkIndex
): LoreLinkTarget[] {
  const resolved = new Map<string, LoreLinkTarget>()

  for (const token of extractWikiLinkTokens(...texts)) {
    const target = resolveWikiLinkToken(token, index)
    if (target) {
      resolved.set(target.id, target)
    }
  }

  return Array.from(resolved.values())
}

export async function syncLoreEntryLinks(
  supabase: Client,
  sourceEntryId: string,
  projectId: string,
  texts: string[]
) {
  const { data: entries } = await supabase
    .from("lore_entries")
    .select("id, slug, name, summary, entry_type")
    .eq("project_id", projectId)

  const index = buildLoreLinkIndex(entries ?? [])
  const targets = resolveWikiLinksFromTexts(texts, index)

  await supabase.from("lore_entry_links").delete().eq("source_entry_id", sourceEntryId)

  if (targets.length === 0) {
    return
  }

  const rows = targets.map((target) => ({
    source_entry_id: sourceEntryId,
    target_entry_id: target.id,
    anchor_text: target.name,
  }))

  await supabase.from("lore_entry_links").insert(rows)
}
