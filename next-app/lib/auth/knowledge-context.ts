import { notFound } from "next/navigation"

import type {
  DesignDocumentDetail,
  DesignDocumentWithAuthor,
  LoreEntryDetail,
  LoreEntryWithAuthor,
  LoreGraph,
  Profile,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

async function attachAuthors<T extends { author_id: string | null }>(
  rows: T[]
): Promise<Array<T & { author: Profile | null }>> {
  if (rows.length === 0) {
    return []
  }

  const supabase = await createClient()
  const authorIds = [...new Set(rows.map((row) => row.author_id).filter(Boolean))] as string[]
  const { data: profiles } =
    authorIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", authorIds)
      : { data: [] as Profile[] }

  return rows.map((row) => ({
    ...row,
    author: profiles?.find((profile) => profile.id === row.author_id) ?? null,
  }))
}

async function attachVersionAuthors<T extends { created_by: string | null }>(
  rows: T[]
): Promise<Array<T & { author: Profile | null }>> {
  if (rows.length === 0) {
    return []
  }

  const supabase = await createClient()
  const authorIds = [...new Set(rows.map((row) => row.created_by).filter(Boolean))] as string[]
  const { data: profiles } =
    authorIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", authorIds)
      : { data: [] as Profile[] }

  return rows.map((row) => ({
    ...row,
    author: profiles?.find((profile) => profile.id === row.created_by) ?? null,
  }))
}

export async function getDesignDocuments(
  projectId: string
): Promise<DesignDocumentWithAuthor[]> {
  const supabase = await createClient()

  const { data: documents } = await supabase
    .from("design_documents")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })

  return attachAuthors(documents ?? [])
}

export async function getDesignDocument(
  projectId: string,
  docSlug: string
): Promise<DesignDocumentDetail | null> {
  const supabase = await createClient()

  const { data: document } = await supabase
    .from("design_documents")
    .select("*")
    .eq("project_id", projectId)
    .eq("slug", docSlug)
    .maybeSingle()

  if (!document) {
    return null
  }

  const [withAuthor] = await attachAuthors([document])

  const { data: versions } = await supabase
    .from("design_document_versions")
    .select("*")
    .eq("document_id", document.id)
    .order("version_number", { ascending: false })
    .limit(20)

  return {
    ...withAuthor,
    versions: await attachVersionAuthors(versions ?? []),
  }
}

export async function requireDesignDocument(projectId: string, docSlug: string) {
  const document = await getDesignDocument(projectId, docSlug)

  if (!document) {
    notFound()
  }

  return document
}

export async function getLoreEntries(projectId: string): Promise<LoreEntryWithAuthor[]> {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from("lore_entries")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })

  return attachAuthors(entries ?? [])
}

export async function getLoreEntry(
  projectId: string,
  entrySlug: string
): Promise<LoreEntryDetail | null> {
  const supabase = await createClient()

  const { data: entry } = await supabase
    .from("lore_entries")
    .select("*")
    .eq("project_id", projectId)
    .eq("slug", entrySlug)
    .maybeSingle()

  if (!entry) {
    return null
  }

  const [withAuthor] = await attachAuthors([entry])

  const [{ data: versions }, { data: relationshipRows }] = await Promise.all([
    supabase
      .from("lore_entry_versions")
      .select("*")
      .eq("entry_id", entry.id)
      .order("version_number", { ascending: false })
      .limit(20),
    supabase
      .from("lore_entry_relationships")
      .select("*")
      .eq("source_entry_id", entry.id),
  ])

  const targetIds = relationshipRows?.map((row) => row.target_entry_id) ?? []
  const { data: targets } =
    targetIds.length > 0
      ? await supabase.from("lore_entries").select("id, name, slug").in("id", targetIds)
      : { data: [] as Array<{ id: string; name: string; slug: string }> }

  const relationships =
    relationshipRows?.flatMap((row) => {
      const target = targets?.find((item) => item.id === row.target_entry_id)
      if (!target) {
        return []
      }
      return [
        {
          ...row,
          target_name: target.name,
          target_slug: target.slug,
        },
      ]
    }) ?? []

  return {
    ...withAuthor,
    versions: await attachVersionAuthors(versions ?? []),
    relationships,
  }
}

export async function requireLoreEntry(projectId: string, entrySlug: string) {
  const entry = await getLoreEntry(projectId, entrySlug)

  if (!entry) {
    notFound()
  }

  return entry
}

export async function getLoreEntriesForLinking(projectId: string, excludeEntryId?: string) {
  const supabase = await createClient()

  let query = supabase
    .from("lore_entries")
    .select("id, name, slug")
    .eq("project_id", projectId)
    .order("name")

  if (excludeEntryId) {
    query = query.neq("id", excludeEntryId)
  }

  const { data } = await query
  return data ?? []
}

export async function getLoreGraph(projectId: string): Promise<LoreGraph> {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from("lore_entries")
    .select("id, name, slug, entry_type")
    .eq("project_id", projectId)
    .order("name")

  const nodes = entries ?? []
  if (nodes.length === 0) {
    return { nodes: [], edges: [] }
  }

  const entryIds = nodes.map((entry) => entry.id)
  const nodeIdSet = new Set(entryIds)

  const { data: relationships } = await supabase
    .from("lore_entry_relationships")
    .select("id, source_entry_id, target_entry_id, relationship_type, label")
    .in("source_entry_id", entryIds)

  const edges =
    relationships
      ?.filter((row) => nodeIdSet.has(row.target_entry_id))
      .map((row) => ({
        id: row.id,
        sourceId: row.source_entry_id,
        targetId: row.target_entry_id,
        relationshipType: row.relationship_type,
        label: row.label,
      })) ?? []

  return { nodes, edges }
}
