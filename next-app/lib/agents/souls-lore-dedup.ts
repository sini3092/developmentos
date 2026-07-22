import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import { slugify } from "@/lib/utils/format"

type Client = SupabaseClient<Database>

export type LoreEntryMatch = {
  id: string
  name: string
  slug: string
  entry_type: string
  summary: string | null
  content: string
}

export function normalizeLoreName(name: string) {
  return name
    .toLowerCase()
    .replace(/^the\s+/i, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function buildSlugVariants(name: string, slug?: string | null) {
  const variants = new Set<string>()
  const normalizedName = normalizeLoreName(name)

  const candidates = [
    slug ? slugify(slug) : null,
    slugify(name),
    slugify(normalizedName),
    slugify(`the ${normalizedName}`),
  ].filter(Boolean) as string[]

  for (const candidate of candidates) {
    variants.add(candidate)
  }

  const words = normalizedName.split(" ").filter((word) => word.length > 3)
  if (words.length >= 2) {
    variants.add(slugify(words.slice(0, 2).join(" ")))
    variants.add(slugify(words.slice(-2).join(" ")))
  }
  if (words.length >= 1) {
    variants.add(slugify(words[0]))
  }

  return [...variants]
}

function normalizeParagraph(text: string) {
  return text.toLowerCase().replace(/\s+/g, " ").trim()
}

function paragraphsAreSimilar(left: string, right: string) {
  if (!left || !right) {
    return false
  }
  if (left === right) {
    return true
  }
  if (left.length > 24 && right.length > 24) {
    return left.includes(right) || right.includes(left)
  }
  return false
}

export function mergeUniqueText(existing: string, incoming: string) {
  const existingTrim = existing.trim()
  const incomingTrim = incoming.trim()

  if (!incomingTrim) {
    return existingTrim
  }
  if (!existingTrim) {
    return incomingTrim
  }
  if (existingTrim.includes(incomingTrim)) {
    return existingTrim
  }
  if (incomingTrim.includes(existingTrim)) {
    return incomingTrim
  }

  const existingParagraphs = existingTrim.split(/\n\s*\n/).map((part) => normalizeParagraph(part))
  const incomingParagraphs = incomingTrim.split(/\n\s*\n/).filter((part) => {
    const normalized = normalizeParagraph(part)
    if (!normalized) {
      return false
    }
    return !existingParagraphs.some((existing) => paragraphsAreSimilar(existing, normalized))
  })

  if (incomingParagraphs.length === 0) {
    return existingTrim
  }

  return `${existingTrim}\n\n${incomingParagraphs.join("\n\n")}`
}

export function mergeSummary(existing: string | null | undefined, incoming: string | null | undefined) {
  const current = existing?.trim() ?? ""
  const next = incoming?.trim() ?? ""

  if (!next) {
    return current || null
  }
  if (!current) {
    return next
  }
  if (normalizeParagraph(current) === normalizeParagraph(next)) {
    return current
  }
  if (current.includes(next)) {
    return current
  }
  if (next.includes(current)) {
    return next
  }

  return mergeUniqueText(current, next)
}

function namesLikelyMatch(left: string, right: string) {
  const a = normalizeLoreName(left)
  const b = normalizeLoreName(right)

  if (!a || !b) {
    return false
  }
  if (a === b) {
    return true
  }
  if (a.includes(b) || b.includes(a)) {
    const shorter = Math.min(a.length, b.length)
    const longer = Math.max(a.length, b.length)
    return shorter / longer >= 0.55
  }

  const aWords = new Set(a.split(" "))
  const bWords = new Set(b.split(" "))
  let overlap = 0
  for (const word of aWords) {
    if (bWords.has(word) && word.length > 3) {
      overlap += 1
    }
  }

  return overlap >= 2
}

export async function findDuplicateLoreEntry(
  supabase: Client,
  projectId: string,
  input: { name: string; slug?: string | null }
): Promise<{ entry: LoreEntryMatch; reason: string } | null> {
  for (const variant of buildSlugVariants(input.name, input.slug)) {
    const { data } = await supabase
      .from("lore_entries")
      .select("id, name, slug, entry_type, summary, content")
      .eq("project_id", projectId)
      .eq("slug", variant)
      .neq("canon_status", "archived")
      .maybeSingle()

    if (data) {
      return { entry: data, reason: `slug:${variant}` }
    }
  }

  const normalized = normalizeLoreName(input.name)
  if (normalized) {
    const { data: byName } = await supabase
      .from("lore_entries")
      .select("id, name, slug, entry_type, summary, content")
      .eq("project_id", projectId)
      .ilike("name", input.name)
      .neq("canon_status", "archived")
      .maybeSingle()

    if (byName) {
      return { entry: byName, reason: "name-exact" }
    }
  }

  const { data: entries } = await supabase
    .from("lore_entries")
    .select("id, name, slug, entry_type, summary, content")
    .eq("project_id", projectId)
    .neq("canon_status", "archived")
    .order("updated_at", { ascending: false })
    .limit(120)

  for (const entry of entries ?? []) {
    if (namesLikelyMatch(entry.name, input.name)) {
      return { entry, reason: "name-similar" }
    }
  }

  return null
}

export function actionDedupeKey(tool: string, toolInput: Record<string, unknown>) {
  const slug = toolInput.slug ? slugify(String(toolInput.slug)) : null
  const name = toolInput.name ? normalizeLoreName(String(toolInput.name)) : null
  const entrySlug = toolInput.entrySlug ? slugify(String(toolInput.entrySlug)) : null
  const entryName = toolInput.entryName ? normalizeLoreName(String(toolInput.entryName)) : null
  const sectionKey = toolInput.sectionKey ? String(toolInput.sectionKey) : null
  const collectionSlug = toolInput.collectionSlug
    ? slugify(String(toolInput.collectionSlug))
    : toolInput.collectionName
      ? slugify(String(toolInput.collectionName))
      : null

  return [tool, slug, name, entrySlug, entryName, sectionKey, collectionSlug].filter(Boolean).join("::")
}

export function dedupeAgentActions(
  actions: Array<{ tool: string; label: string; input: Record<string, unknown> }>
) {
  const seen = new Set<string>()
  const deduped: typeof actions = []

  for (const action of actions) {
    const key = actionDedupeKey(action.tool, action.input ?? {})
    if (seen.has(key)) {
      continue
    }
    seen.add(key)
    deduped.push(action)
  }

  return deduped
}
