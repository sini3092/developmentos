import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  CanonStatus,
  Database,
  LoreEntryType,
  LoreRelationshipType,
} from "@/lib/database.types"
import { syncLoreEntryLinks } from "@/lib/lore/internal-links"
import { ensureLoreSectionsForEntry, syncLoreSectionTemplates } from "@/lib/lore/sections"
import type { SoulsActionResult } from "@/lib/souls/message-metadata"
import { slugify } from "@/lib/utils/format"

type Client = SupabaseClient<Database>
type ToolInput = Record<string, unknown>

type LoreEntryRef = {
  id: string
  name: string
  slug: string
  entry_type: LoreEntryType
  summary: string | null
  content: string
  canon_status: CanonStatus
  parent_entry_id: string | null
}

export async function resolveLoreEntry(
  supabase: Client,
  projectId: string,
  ref: { entryId?: string | null; slug?: string | null; name?: string | null }
): Promise<LoreEntryRef | null> {
  if (ref.entryId) {
    const { data } = await supabase
      .from("lore_entries")
      .select("id, name, slug, entry_type, summary, content, canon_status, parent_entry_id")
      .eq("id", ref.entryId)
      .eq("project_id", projectId)
      .maybeSingle()
    return data
  }

  const slug = ref.slug ? slugify(String(ref.slug)) : ref.name ? slugify(String(ref.name)) : null
  if (slug) {
    const { data } = await supabase
      .from("lore_entries")
      .select("id, name, slug, entry_type, summary, content, canon_status, parent_entry_id")
      .eq("project_id", projectId)
      .eq("slug", slug)
      .maybeSingle()
    if (data) {
      return data
    }
  }

  if (ref.name) {
    const { data } = await supabase
      .from("lore_entries")
      .select("id, name, slug, entry_type, summary, content, canon_status, parent_entry_id")
      .eq("project_id", projectId)
      .ilike("name", String(ref.name))
      .maybeSingle()
    return data
  }

  return null
}

type ParsedSection = {
  sectionKey: string
  title?: string
  content: string
}

function parseSections(input: ToolInput): ParsedSection[] {
  const raw = input.sections
  if (!Array.isArray(raw)) {
    return []
  }

  const sections: ParsedSection[] = []
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue
    }
    const section = item as Record<string, unknown>
    const sectionKey = String(section.sectionKey ?? "").trim()
    if (!sectionKey) {
      continue
    }
    sections.push({
      sectionKey,
      title: section.title ? String(section.title) : undefined,
      content: section.content ? String(section.content) : "",
    })
  }
  return sections
}

async function applyLoreSections(
  supabase: Client,
  entry: Pick<LoreEntryRef, "id" | "entry_type" | "content">,
  sections: ParsedSection[],
  seedContent?: string | null
) {
  await ensureLoreSectionsForEntry(supabase, entry.id, entry.entry_type, seedContent ?? entry.content)

  for (const section of sections) {
    const patch: { content: string; title?: string; updated_at: string } = {
      content: section.content,
      updated_at: new Date().toISOString(),
    }
    if (section.title) {
      patch.title = section.title
    }

    await supabase
      .from("lore_sections")
      .update(patch)
      .eq("entry_id", entry.id)
      .eq("section_key", section.sectionKey)
  }
}

async function syncEntryLinksForTexts(
  supabase: Client,
  entryId: string,
  projectId: string,
  texts: string[]
) {
  await syncLoreEntryLinks(supabase, entryId, projectId, texts)
}

export async function executeSoulsLoreTool(input: {
  tool: string
  label: string
  toolInput: ToolInput
  projectId: string
  projectSlug: string
  workspaceId: string
  userId: string
  supabase: Client
}): Promise<SoulsActionResult | null> {
  const { supabase, tool, label, toolInput, projectId, projectSlug, workspaceId, userId } = input

  switch (tool) {
    case "lore.list": {
      const { data } = await supabase
        .from("lore_entries")
        .select("id, name, slug, entry_type, canon_status, summary, parent_entry_id")
        .eq("project_id", projectId)
        .neq("canon_status", "archived")
        .order("name")
        .limit(120)

      return {
        tool,
        label,
        status: "success",
        summary: `Loaded ${data?.length ?? 0} lore entries`,
        after: { count: data?.length ?? 0, entries: data ?? [] },
      }
    }

    case "lore.upsert": {
      const name = String(toolInput.name ?? "").trim()
      if (!name) {
        throw new Error("Lore name is required.")
      }

      const explicitSlug = toolInput.slug ? slugify(String(toolInput.slug)) : slugify(name)
      let entryId = toolInput.entryId ? String(toolInput.entryId) : null
      let before: LoreEntryRef | undefined

      if (!entryId) {
        const existing = await resolveLoreEntry(supabase, projectId, { slug: explicitSlug, name })
        if (existing) {
          entryId = existing.id
          before = existing
        }
      } else {
        const existing = await resolveLoreEntry(supabase, projectId, { entryId })
        before = existing ?? undefined
      }

      let parentEntryId: string | null = null
      if (toolInput.parentEntryId) {
        parentEntryId = String(toolInput.parentEntryId)
      } else if (toolInput.parentSlug || toolInput.parentName) {
        const parent = await resolveLoreEntry(supabase, projectId, {
          slug: toolInput.parentSlug ? String(toolInput.parentSlug) : null,
          name: toolInput.parentName ? String(toolInput.parentName) : null,
        })
        if (!parent) {
          throw new Error(`Parent entry not found: ${toolInput.parentSlug ?? toolInput.parentName}`)
        }
        parentEntryId = parent.id
      }

      const entryType =
        (toolInput.entryType as LoreEntryType | undefined) ?? before?.entry_type ?? "other"
      const content = toolInput.content !== undefined ? String(toolInput.content) : undefined
      const sections = parseSections(toolInput)

      if (entryId) {
        const updatePayload: {
          name: string
          slug: string
          entry_type: LoreEntryType
          summary?: string | null
          content?: string
          canon_status: CanonStatus
          parent_entry_id?: string | null
          updated_at: string
        } = {
          name,
          slug: explicitSlug,
          entry_type: entryType,
          canon_status: (toolInput.canonStatus as CanonStatus) ?? before?.canon_status ?? "draft",
          updated_at: new Date().toISOString(),
        }

        if (toolInput.summary !== undefined) {
          updatePayload.summary = String(toolInput.summary) || null
        }
        if (content !== undefined) {
          updatePayload.content = content
        }
        if (toolInput.parentSlug || toolInput.parentName || toolInput.parentEntryId) {
          updatePayload.parent_entry_id = parentEntryId
        } else if (toolInput.clearParent) {
          updatePayload.parent_entry_id = null
        }

        const { data, error } = await supabase
          .from("lore_entries")
          .update(updatePayload)
          .eq("id", entryId)
          .eq("project_id", projectId)
          .select("id, name, slug, entry_type, summary, canon_status, content, parent_entry_id")
          .single()

        if (error) {
          throw error
        }

        if (sections.length > 0) {
          await applyLoreSections(supabase, data, sections, content ?? data.content)
        } else if (content !== undefined) {
          await syncLoreSectionTemplates(supabase, data.id, data.entry_type)
        }

        const linkTexts = [
          content ?? data.content,
          ...sections.map((section) => section.content),
          toolInput.summary ? String(toolInput.summary) : "",
        ]
        await syncEntryLinksForTexts(supabase, data.id, projectId, linkTexts)

        return {
          tool,
          label,
          status: "success",
          href: `/projects/${projectSlug}/lore/${data.slug}`,
          summary: `Updated ${data.name}`,
          before,
          after: data,
        }
      }

      const { data, error } = await supabase
        .from("lore_entries")
        .insert({
          workspace_id: workspaceId,
          project_id: projectId,
          name,
          slug: explicitSlug,
          entry_type: entryType,
          summary: toolInput.summary ? String(toolInput.summary) : null,
          content: content ?? "",
          canon_status: (toolInput.canonStatus as CanonStatus) ?? "draft",
          parent_entry_id: parentEntryId,
          author_id: userId,
          created_by: userId,
        })
        .select("id, name, slug, entry_type, summary, canon_status, content, parent_entry_id")
        .single()

      if (error) {
        throw error
      }

      await applyLoreSections(supabase, data, sections, content ?? data.content)

      const linkTexts = [
        content ?? data.content,
        ...sections.map((section) => section.content),
        toolInput.summary ? String(toolInput.summary) : "",
      ]
      await syncEntryLinksForTexts(supabase, data.id, projectId, linkTexts)

      return {
        tool,
        label,
        status: "success",
        href: `/projects/${projectSlug}/lore/${data.slug}`,
        summary: `Created ${data.name}`,
        after: data,
      }
    }

    case "lore.section.upsert": {
      const entry = await resolveLoreEntry(supabase, projectId, {
        entryId: toolInput.entryId ? String(toolInput.entryId) : null,
        slug: toolInput.entrySlug ? String(toolInput.entrySlug) : null,
        name: toolInput.entryName ? String(toolInput.entryName) : null,
      })

      if (!entry) {
        throw new Error("Lore entry not found for section update.")
      }

      const sectionKey = String(toolInput.sectionKey ?? "").trim()
      if (!sectionKey) {
        throw new Error("sectionKey is required.")
      }

      await syncLoreSectionTemplates(supabase, entry.id, entry.entry_type)

      const { data: before } = await supabase
        .from("lore_sections")
        .select("section_key, title, content")
        .eq("entry_id", entry.id)
        .eq("section_key", sectionKey)
        .maybeSingle()

      const patch: { content: string; title?: string; updated_at: string } = {
        content: String(toolInput.content ?? ""),
        updated_at: new Date().toISOString(),
      }
      if (toolInput.title) {
        patch.title = String(toolInput.title)
      }

      const { data: after, error } = await supabase
        .from("lore_sections")
        .update(patch)
        .eq("entry_id", entry.id)
        .eq("section_key", sectionKey)
        .select("section_key, title, content")
        .single()

      if (error) {
        throw error
      }

      await syncEntryLinksForTexts(supabase, entry.id, projectId, [after.content])

      return {
        tool,
        label,
        status: "success",
        href: `/projects/${projectSlug}/lore/${entry.slug}`,
        summary: `Updated ${entry.name} → ${sectionKey}`,
        before: before ?? undefined,
        after,
      }
    }

    case "lore.relationship": {
      const source = await resolveLoreEntry(supabase, projectId, {
        slug: toolInput.sourceSlug ? String(toolInput.sourceSlug) : null,
        name: toolInput.sourceName ? String(toolInput.sourceName) : null,
        entryId: toolInput.sourceEntryId ? String(toolInput.sourceEntryId) : null,
      })
      const target = await resolveLoreEntry(supabase, projectId, {
        slug: toolInput.targetSlug ? String(toolInput.targetSlug) : null,
        name: toolInput.targetName ? String(toolInput.targetName) : null,
        entryId: toolInput.targetEntryId ? String(toolInput.targetEntryId) : null,
      })

      if (!source || !target) {
        throw new Error("Both source and target entries must exist.")
      }

      const relationshipType = (toolInput.relationshipType as LoreRelationshipType) ?? "related_to"

      const { data: existing } = await supabase
        .from("lore_entry_relationships")
        .select("id")
        .eq("source_entry_id", source.id)
        .eq("target_entry_id", target.id)
        .eq("relationship_type", relationshipType)
        .maybeSingle()

      if (!existing) {
        const { error } = await supabase.from("lore_entry_relationships").insert({
          source_entry_id: source.id,
          target_entry_id: target.id,
          relationship_type: relationshipType,
          label: toolInput.label ? String(toolInput.label) : null,
          created_by: userId,
        })
        if (error) {
          throw error
        }
      }

      return {
        tool,
        label,
        status: "success",
        summary: `${source.name} → ${relationshipType} → ${target.name}`,
        after: { source: source.slug, target: target.slug, relationshipType },
      }
    }

    case "lore.collection.create": {
      const name = String(toolInput.name ?? "").trim()
      if (!name) {
        throw new Error("Collection name is required.")
      }

      const collectionSlug = toolInput.slug ? slugify(String(toolInput.slug)) : slugify(name)
      const { data: existing } = await supabase
        .from("lore_collections")
        .select("id, name, slug")
        .eq("project_id", projectId)
        .eq("slug", collectionSlug)
        .maybeSingle()

      if (existing) {
        return {
          tool,
          label,
          status: "success",
          href: `/projects/${projectSlug}/lore/collections/${existing.slug}`,
          summary: `Collection already exists: ${existing.name}`,
          after: existing,
        }
      }

      const { data, error } = await supabase
        .from("lore_collections")
        .insert({
          project_id: projectId,
          name,
          slug: collectionSlug,
          description: toolInput.description ? String(toolInput.description) : null,
          created_by: userId,
        })
        .select("id, name, slug")
        .single()

      if (error) {
        throw error
      }

      return {
        tool,
        label,
        status: "success",
        href: `/projects/${projectSlug}/lore/collections/${data.slug}`,
        summary: `Created collection ${data.name}`,
        after: data,
      }
    }

    case "lore.collection.add": {
      let collection:
        | {
            id: string
            name: string
            slug: string
          }
        | null
        | undefined = null

      if (toolInput.collectionId) {
        const { data } = await supabase
          .from("lore_collections")
          .select("id, name, slug")
          .eq("id", String(toolInput.collectionId))
          .eq("project_id", projectId)
          .maybeSingle()
        collection = data
      } else {
        const collectionSlug = toolInput.collectionSlug
          ? slugify(String(toolInput.collectionSlug))
          : toolInput.collectionName
            ? slugify(String(toolInput.collectionName))
            : null

        if (collectionSlug) {
          const { data } = await supabase
            .from("lore_collections")
            .select("id, name, slug")
            .eq("project_id", projectId)
            .eq("slug", collectionSlug)
            .maybeSingle()
          collection = data
        }

        if (!collection && toolInput.collectionName) {
          const { data } = await supabase
            .from("lore_collections")
            .select("id, name, slug")
            .eq("project_id", projectId)
            .ilike("name", String(toolInput.collectionName))
            .maybeSingle()
          collection = data
        }
      }

      const entry = await resolveLoreEntry(supabase, projectId, {
        slug: toolInput.entrySlug ? String(toolInput.entrySlug) : null,
        name: toolInput.entryName ? String(toolInput.entryName) : null,
        entryId: toolInput.entryId ? String(toolInput.entryId) : null,
      })

      if (!collection || !entry) {
        throw new Error("Collection and entry must exist.")
      }

      const { data: last } = await supabase
        .from("lore_collection_entries")
        .select("position")
        .eq("collection_id", collection.id)
        .order("position", { ascending: false })
        .limit(1)
        .maybeSingle()

      const { error } = await supabase.from("lore_collection_entries").insert({
        collection_id: collection.id,
        entry_id: entry.id,
        position: (last?.position ?? -1) + 1,
      })

      if (error && !error.message.includes("lore_collection_entries_collection_id_entry_id_key")) {
        throw error
      }

      return {
        tool,
        label,
        status: "success",
        href: `/projects/${projectSlug}/lore/collections/${collection.slug}`,
        summary: `Added ${entry.name} to ${collection.name}`,
        after: { collection: collection.slug, entry: entry.slug },
      }
    }

    default:
      return null
  }
}
