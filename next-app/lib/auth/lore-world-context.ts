import { createClient } from "@/lib/supabase/server"
import type {
  CanonStatus,
  LoreCollection,
  LoreEra,
  LoreEntryType,
  LoreEntryWithAuthor,
  LoreMapMarker,
  LoreMapMarkerType,
  LoreWorldMap,
} from "@/lib/database.types"
import { LORE_GEOGRAPHIC_TYPES } from "@/lib/constants/lore-world"
import { getLoreEntries } from "@/lib/auth/knowledge-context"
import { extractWikiLinkSlugs } from "@/lib/lore/internal-links"

export type LoreTimelineEntry = LoreEntryWithAuthor & {
  era: LoreEra | null
  locationName: string | null
}

export type LoreCollectionWithEntries = LoreCollection & {
  entries: Array<{
    id: string
    position: number
    linkId: string
    entry: LoreEntryWithAuthor
  }>
  entryCount: number
}

export type LoreMapWithMarkers = LoreWorldMap & {
  markers: Array<
    LoreMapMarker & {
      entrySlug: string | null
      entryName: string | null
    }
  >
}

export type LoreGeographyNode = {
  id: string
  name: string
  slug: string
  entry_type: LoreEntryType
  children: LoreGeographyNode[]
}

export type LoreHealthReport = {
  awaitingReview: LoreEntryWithAuthor[]
  missingSummary: LoreEntryWithAuthor[]
  withoutRelationships: LoreEntryWithAuthor[]
  unresolvedComments: Array<{
    entryId: string
    entryName: string
    entrySlug: string
    count: number
  }>
  brokenLinks: Array<{
    entryId: string
    entryName: string
    entrySlug: string
    brokenSlugs: string[]
  }>
  timelineWithoutDates: LoreEntryWithAuthor[]
  recentlyChangedCanon: LoreEntryWithAuthor[]
  totals: {
    awaitingReview: number
    missingSummary: number
    withoutRelationships: number
    unresolvedComments: number
    brokenLinks: number
    timelineWithoutDates: number
    recentlyChangedCanon: number
  }
}

export async function getLoreEras(projectId: string): Promise<LoreEra[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("lore_eras")
    .select("*")
    .eq("project_id", projectId)
    .order("sort_order")
    .order("name")

  return data ?? []
}

export async function getLoreTimeline(projectId: string): Promise<LoreTimelineEntry[]> {
  const supabase = await createClient()
  const entries = await getLoreEntries(projectId)
  const eventEntries = entries.filter(
    (entry) =>
      entry.entry_type === "historical_event" ||
      entry.entry_type === "timeline_event"
  )

  const eraIds = [
    ...new Set(eventEntries.map((entry) => entry.timeline_era_id).filter(Boolean)),
  ] as string[]

  const { data: eras } =
    eraIds.length > 0
      ? await supabase.from("lore_eras").select("*").in("id", eraIds)
      : { data: [] as LoreEra[] }

  const eventIds = eventEntries.map((entry) => entry.id)
  const { data: locatedIn } =
    eventIds.length > 0
      ? await supabase
          .from("lore_entry_relationships")
          .select("source_entry_id, target_entry_id")
          .in("source_entry_id", eventIds)
          .eq("relationship_type", "located_in")
      : { data: [] as Array<{ source_entry_id: string; target_entry_id: string }> }

  const locationIds = locatedIn?.map((row) => row.target_entry_id) ?? []
  const { data: locations } =
    locationIds.length > 0
      ? await supabase.from("lore_entries").select("id, name").in("id", locationIds)
      : { data: [] as Array<{ id: string; name: string }> }

  const sorted = [...eventEntries].sort((a, b) => {
    const aOrder = a.timeline_sort_order ?? Number.MAX_SAFE_INTEGER
    const bOrder = b.timeline_sort_order ?? Number.MAX_SAFE_INTEGER
    if (aOrder !== bOrder) {
      return aOrder - bOrder
    }
    return a.name.localeCompare(b.name)
  })

  return sorted.map((entry) => {
    const locationLink = locatedIn?.find((row) => row.source_entry_id === entry.id)
    const location = locations?.find((item) => item.id === locationLink?.target_entry_id)

    return {
      ...entry,
      era: eras?.find((era) => era.id === entry.timeline_era_id) ?? null,
      locationName: location?.name ?? null,
    }
  })
}

export async function getLoreCollections(projectId: string): Promise<LoreCollection[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("lore_collections")
    .select("*")
    .eq("project_id", projectId)
    .order("is_featured", { ascending: false })
    .order("name")

  return data ?? []
}

export async function getLoreCollectionDetail(
  projectId: string,
  collectionSlug: string
): Promise<LoreCollectionWithEntries | null> {
  const supabase = await createClient()
  const { data: collection } = await supabase
    .from("lore_collections")
    .select("*")
    .eq("project_id", projectId)
    .eq("slug", collectionSlug)
    .maybeSingle()

  if (!collection) {
    return null
  }

  const { data: links } = await supabase
    .from("lore_collection_entries")
    .select("*")
    .eq("collection_id", collection.id)
    .order("position")

  const entryIds = links?.map((link) => link.entry_id) ?? []
  const entries = await getLoreEntries(projectId)
  const entryById = new Map(entries.map((entry) => [entry.id, entry]))

  const orderedEntries =
    links?.flatMap((link) => {
      const entry = entryById.get(link.entry_id)
      if (!entry) {
        return []
      }
      return [
        {
          id: entry.id,
          position: link.position,
          linkId: link.id,
          entry,
        },
      ]
    }) ?? []

  return {
    ...collection,
    entries: orderedEntries,
    entryCount: orderedEntries.length,
  }
}

export async function getLoreWorldMaps(projectId: string): Promise<LoreMapWithMarkers[]> {
  const supabase = await createClient()
  const { data: maps } = await supabase
    .from("lore_world_maps")
    .select("*")
    .eq("project_id", projectId)
    .order("is_primary", { ascending: false })
    .order("name")

  if (!maps?.length) {
    return []
  }

  const mapIds = maps.map((map) => map.id)
  const { data: markers } = await supabase
    .from("lore_map_markers")
    .select("*")
    .in("map_id", mapIds)

  const entryIds = markers?.map((marker) => marker.entry_id).filter(Boolean) as string[]
  const { data: entries } =
    entryIds.length > 0
      ? await supabase.from("lore_entries").select("id, name, slug").in("id", entryIds)
      : { data: [] as Array<{ id: string; name: string; slug: string }> }

  return maps.map((map) => ({
    ...map,
    markers:
      markers
        ?.filter((marker) => marker.map_id === map.id)
        .map((marker) => {
          const entry = entries?.find((item) => item.id === marker.entry_id)
          return {
            ...marker,
            entrySlug: entry?.slug ?? null,
            entryName: entry?.name ?? null,
          }
        }) ?? [],
  }))
}

export async function getLoreGeographyTree(projectId: string): Promise<LoreGeographyNode[]> {
  const entries = await getLoreEntries(projectId)
  const geographic = entries.filter((entry) =>
    LORE_GEOGRAPHIC_TYPES.includes(entry.entry_type as (typeof LORE_GEOGRAPHIC_TYPES)[number])
  )

  const nodeById = new Map<string, LoreGeographyNode>(
    geographic.map((entry) => [
      entry.id,
      {
        id: entry.id,
        name: entry.name,
        slug: entry.slug,
        entry_type: entry.entry_type,
        children: [],
      },
    ])
  )

  const childIds = new Set<string>()

  for (const entry of geographic) {
    if (entry.parent_entry_id && nodeById.has(entry.parent_entry_id)) {
      const parent = nodeById.get(entry.parent_entry_id)!
      const child = nodeById.get(entry.id)!
      parent.children.push(child)
      childIds.add(entry.id)
    }
  }

  const supabase = await createClient()
  const geoIds = geographic.map((entry) => entry.id)
  let relationships: Array<{
    source_entry_id: string
    target_entry_id: string
    relationship_type: string
  }> = []

  if (geoIds.length > 0) {
    const [{ data: asSource }, { data: asTarget }] = await Promise.all([
      supabase
        .from("lore_entry_relationships")
        .select("source_entry_id, target_entry_id, relationship_type")
        .in("source_entry_id", geoIds),
      supabase
        .from("lore_entry_relationships")
        .select("source_entry_id, target_entry_id, relationship_type")
        .in("target_entry_id", geoIds),
    ])
    const seen = new Set<string>()
    for (const row of [...(asSource ?? []), ...(asTarget ?? [])]) {
      const key = `${row.source_entry_id}:${row.target_entry_id}:${row.relationship_type}`
      if (!seen.has(key)) {
        seen.add(key)
        relationships.push(row)
      }
    }
  }

  for (const row of relationships) {
    if (row.relationship_type === "parent_of" && nodeById.has(row.source_entry_id)) {
      const parent = nodeById.get(row.source_entry_id)!
      const child = nodeById.get(row.target_entry_id)
      if (child && !childIds.has(child.id)) {
        parent.children.push(child)
        childIds.add(child.id)
      }
    }
    if (row.relationship_type === "located_in" && nodeById.has(row.target_entry_id)) {
      const parent = nodeById.get(row.target_entry_id)!
      const child = nodeById.get(row.source_entry_id)
      if (child && !childIds.has(child.id)) {
        parent.children.push(child)
        childIds.add(child.id)
      }
    }
  }

  const sortNodes = (nodes: LoreGeographyNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    nodes.forEach((node) => sortNodes(node.children))
  }

  const roots = geographic
    .filter((entry) => !childIds.has(entry.id))
    .flatMap((entry) => {
      const node = nodeById.get(entry.id)
      return node ? [node] : []
    })

  sortNodes(roots)
  return roots
}

export async function getLoreHealthReport(projectId: string): Promise<LoreHealthReport> {
  const supabase = await createClient()
  const entries = await getLoreEntries(projectId)
  const active = entries.filter((entry) => entry.canon_status !== "archived")

  const entryIds = active.map((entry) => entry.id)
  const [{ data: asSource }, { data: asTarget }] = await Promise.all([
    entryIds.length > 0
      ? supabase
          .from("lore_entry_relationships")
          .select("source_entry_id, target_entry_id")
          .in("source_entry_id", entryIds)
      : Promise.resolve({ data: [] as Array<{ source_entry_id: string; target_entry_id: string }> }),
    entryIds.length > 0
      ? supabase
          .from("lore_entry_relationships")
          .select("source_entry_id, target_entry_id")
          .in("target_entry_id", entryIds)
      : Promise.resolve({ data: [] as Array<{ source_entry_id: string; target_entry_id: string }> }),
  ])

  const relationships = [...(asSource ?? []), ...(asTarget ?? [])]

  const { data: comments } =
    entryIds.length > 0
      ? await supabase
          .from("lore_comments")
          .select("entry_id")
          .in("entry_id", entryIds)
          .eq("status", "open")
      : { data: [] as Array<{ entry_id: string }> }

  const relatedIds = new Set<string>()
  for (const row of relationships) {
    relatedIds.add(row.source_entry_id)
    relatedIds.add(row.target_entry_id)
  }

  const slugSet = new Set(active.map((entry) => entry.slug))
  const brokenLinks = active.flatMap((entry) => {
    const slugs = extractWikiLinkSlugs(entry.content)
    const broken = slugs.filter((slug) => !slugSet.has(slug))
    if (broken.length === 0) {
      return []
    }
    return [
      {
        entryId: entry.id,
        entryName: entry.name,
        entrySlug: entry.slug,
        brokenSlugs: broken,
      },
    ]
  })

  const commentCounts = new Map<string, number>()
  for (const comment of comments ?? []) {
    commentCounts.set(comment.entry_id, (commentCounts.get(comment.entry_id) ?? 0) + 1)
  }

  const awaitingReview = active.filter((entry) => entry.canon_status === "review")
  const missingSummary = active.filter((entry) => !entry.summary?.trim())
  const withoutRelationships = active.filter((entry) => !relatedIds.has(entry.id))
  const timelineWithoutDates = active.filter(
    (entry) =>
      (entry.entry_type === "historical_event" || entry.entry_type === "timeline_event") &&
      !entry.timeline_label?.trim()
  )

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recentlyChangedCanon = active
    .filter(
      (entry) =>
        entry.canon_status === "canon" && new Date(entry.updated_at).getTime() >= weekAgo
    )
    .slice(0, 10)

  const unresolvedComments = [...commentCounts.entries()].map(([entryId, count]) => {
    const entry = active.find((item) => item.id === entryId)!
    return {
      entryId,
      entryName: entry.name,
      entrySlug: entry.slug,
      count,
    }
  })

  return {
    awaitingReview,
    missingSummary: missingSummary.slice(0, 10),
    withoutRelationships: withoutRelationships.slice(0, 10),
    unresolvedComments,
    brokenLinks: brokenLinks.slice(0, 10),
    timelineWithoutDates: timelineWithoutDates.slice(0, 10),
    recentlyChangedCanon,
    totals: {
      awaitingReview: awaitingReview.length,
      missingSummary: missingSummary.length,
      withoutRelationships: withoutRelationships.length,
      unresolvedComments: unresolvedComments.length,
      brokenLinks: brokenLinks.length,
      timelineWithoutDates: timelineWithoutDates.length,
      recentlyChangedCanon: recentlyChangedCanon.length,
    },
  }
}

export async function getCollectionEntryOptions(projectId: string, collectionId: string) {
  const entries = await getLoreEntries(projectId)
  const supabase = await createClient()
  const { data: links } = await supabase
    .from("lore_collection_entries")
    .select("entry_id")
    .eq("collection_id", collectionId)

  const linked = new Set(links?.map((link) => link.entry_id) ?? [])
  return entries.filter(
    (entry) => entry.canon_status !== "archived" && !linked.has(entry.id)
  )
}

export async function getMapMarkerEntryOptions(projectId: string) {
  const entries = await getLoreEntries(projectId)
  return entries.filter((entry) => entry.canon_status !== "archived")
}

export type { LoreMapMarkerType, CanonStatus }
