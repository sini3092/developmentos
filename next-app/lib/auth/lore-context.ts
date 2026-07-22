import type { CanonStatus, LoreEntryType } from "@/lib/database.types"
import type { LoreEntryWithAuthor } from "@/lib/database.types"
import {
  ACTIVE_CANON_STATUSES,
  LORE_CATEGORY_CARDS,
  type LoreCategoryCard,
} from "@/lib/constants/lore-navigation"
import { createClient } from "@/lib/supabase/server"
import { getLoreEntries } from "@/lib/auth/knowledge-context"

export type LoreEntryFilters = {
  types?: LoreEntryType[]
  canonStatuses?: CanonStatus[]
  excludeArchived?: boolean
  search?: string
}

export type LoreOverview = {
  totalEntries: number
  canonCount: number
  draftCount: number
  reviewCount: number
  archivedCount: number
  conceptCount: number
  recentlyUpdated: LoreEntryWithAuthor[]
  categoryCards: Array<
    LoreCategoryCard & {
      count: number
      recentEntry: LoreEntryWithAuthor | null
    }
  >
}

export type LoreBacklink = {
  id: string
  name: string
  slug: string
  entry_type: LoreEntryType
  relationship_type: string
  label: string | null
}

function matchesSearch(entry: LoreEntryWithAuthor, search: string) {
  const query = search.trim().toLowerCase()
  if (!query) {
    return true
  }
  return (
    entry.name.toLowerCase().includes(query) ||
    (entry.summary?.toLowerCase().includes(query) ?? false) ||
    entry.content.toLowerCase().includes(query)
  )
}

export function filterLoreEntries(
  entries: LoreEntryWithAuthor[],
  filters: LoreEntryFilters
) {
  return entries.filter((entry) => {
    if (filters.excludeArchived && entry.canon_status === "archived") {
      return false
    }
    if (filters.types?.length && !filters.types.includes(entry.entry_type)) {
      return false
    }
    if (filters.canonStatuses?.length && !filters.canonStatuses.includes(entry.canon_status)) {
      return false
    }
    if (filters.search && !matchesSearch(entry, filters.search)) {
      return false
    }
    return true
  })
}

export async function getLoreOverview(projectId: string): Promise<LoreOverview> {
  const entries = await getLoreEntries(projectId)
  const active = entries.filter((entry) => entry.canon_status !== "archived")

  const categoryCards = LORE_CATEGORY_CARDS.map((category) => {
    const inCategory = active.filter((entry) => category.types.includes(entry.entry_type))
    return {
      ...category,
      count: inCategory.length,
      recentEntry: inCategory[0] ?? null,
    }
  })

  return {
    totalEntries: active.length,
    canonCount: active.filter((entry) => entry.canon_status === "canon").length,
    draftCount: active.filter((entry) => entry.canon_status === "draft").length,
    reviewCount: active.filter((entry) => entry.canon_status === "review").length,
    archivedCount: entries.filter((entry) => entry.canon_status === "archived").length,
    conceptCount: active.filter((entry) => entry.canon_status === "concept").length,
    recentlyUpdated: active.slice(0, 8),
    categoryCards,
  }
}

export async function getFilteredLoreEntries(projectId: string, filters: LoreEntryFilters) {
  const entries = await getLoreEntries(projectId)
  return filterLoreEntries(entries, filters)
}

export async function getLoreBacklinks(projectId: string, entryId: string) {
  const supabase = await createClient()

  const { data: relationships } = await supabase
    .from("lore_entry_relationships")
    .select("id, source_entry_id, relationship_type, label")
    .eq("target_entry_id", entryId)

  if (!relationships?.length) {
    return [] as LoreBacklink[]
  }

  const sourceIds = relationships.map((row) => row.source_entry_id)
  const { data: sources } = await supabase
    .from("lore_entries")
    .select("id, name, slug, entry_type")
    .eq("project_id", projectId)
    .in("id", sourceIds)

  return relationships.flatMap((row) => {
    const source = sources?.find((item) => item.id === row.source_entry_id)
    if (!source) {
      return []
    }
    return [
      {
        id: row.id,
        name: source.name,
        slug: source.slug,
        entry_type: source.entry_type,
        relationship_type: row.relationship_type,
        label: row.label,
      },
    ]
  })
}

export function countEntriesByCanon(entries: LoreEntryWithAuthor[]) {
  return {
    active: entries.filter((entry) => ACTIVE_CANON_STATUSES.includes(entry.canon_status))
      .length,
    archived: entries.filter((entry) => entry.canon_status === "archived").length,
  }
}
