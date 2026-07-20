"use server"

import { revalidatePath } from "next/cache"

import type {
  CanonStatus,
  DesignDocument,
  DocumentStatus,
  LoreEntry,
  LoreEntryType,
  LoreRelationshipType,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils/format"
import { parseEditorPayload } from "@/lib/utils/tiptap"

export type KnowledgeActionState = {
  error?: string
  success?: string
}

function revalidateDesignPaths(slug: string, docSlug?: string) {
  revalidatePath(`/projects/${slug}/design`)
  if (docSlug) {
    revalidatePath(`/projects/${slug}/design/${docSlug}`)
  }
}

function revalidateLorePaths(slug: string, entrySlug?: string) {
  revalidatePath(`/projects/${slug}/lore`)
  if (entrySlug) {
    revalidatePath(`/projects/${slug}/lore/${entrySlug}`)
  }
}

async function getNextDesignVersionNumber(supabase: Awaited<ReturnType<typeof createClient>>, documentId: string) {
  const { data } = await supabase
    .from("design_document_versions")
    .select("version_number")
    .eq("document_id", documentId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data?.version_number ?? 0) + 1
}

async function getNextLoreVersionNumber(supabase: Awaited<ReturnType<typeof createClient>>, entryId: string) {
  const { data } = await supabase
    .from("lore_entry_versions")
    .select("version_number")
    .eq("entry_id", entryId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle()

  return (data?.version_number ?? 0) + 1
}

async function snapshotDesignDocument(
  supabase: Awaited<ReturnType<typeof createClient>>,
  document: DesignDocument,
  userId: string | null
) {
  const versionNumber = await getNextDesignVersionNumber(supabase, document.id)
  await supabase.from("design_document_versions").insert({
    document_id: document.id,
    version_number: versionNumber,
    title: document.title,
    summary: document.summary,
    content: document.content,
    content_json: document.content_json,
    content_format: document.content_format,
    category: document.category,
    status: document.status,
    created_by: userId,
  })
}

async function snapshotLoreEntry(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entry: LoreEntry,
  userId: string | null
) {
  const versionNumber = await getNextLoreVersionNumber(supabase, entry.id)
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
    created_by: userId,
  })
}

function hasDesignContentChanged(document: DesignDocument, nextContent: string, nextContentJson: unknown) {
  return (
    document.content !== nextContent ||
    JSON.stringify(document.content_json ?? null) !== JSON.stringify(nextContentJson ?? null)
  )
}

function hasLoreContentChanged(entry: LoreEntry, nextContent: string, nextContentJson: unknown) {
  return (
    entry.content !== nextContent ||
    JSON.stringify(entry.content_json ?? null) !== JSON.stringify(nextContentJson ?? null)
  )
}

export async function createDesignDocument(
  _prevState: KnowledgeActionState,
  formData: FormData
): Promise<KnowledgeActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  const docSlugInput = String(formData.get("docSlug") ?? "").trim()
  const category = String(formData.get("category") ?? "gameplay_loops")
  const summary = String(formData.get("summary") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const status = String(formData.get("status") ?? "draft") as DocumentStatus

  if (!workspaceId || !projectId || !title) {
    return { error: "Document title is required." }
  }

  const docSlug = docSlugInput || slugify(title)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(docSlug)) {
    return { error: "Slug must use lowercase letters, numbers, and hyphens." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { error } = await supabase.from("design_documents").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    title,
    slug: docSlug,
    category,
    summary: summary || null,
    content: content || `# ${title}\n\n${summary || ""}`,
    status,
    author_id: user.id,
    created_by: user.id,
  })

  if (error) {
    if (error.message.includes("design_documents_project_id_slug_key")) {
      return { error: "A document with this slug already exists." }
    }
    return { error: error.message }
  }

  revalidateDesignPaths(slug, docSlug)
  return { success: "Design document created." }
}

export async function updateDesignDocument(
  _prevState: KnowledgeActionState,
  formData: FormData
): Promise<KnowledgeActionState> {
  const documentId = String(formData.get("documentId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const docSlug = String(formData.get("docSlug") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  const category = String(formData.get("category") ?? "gameplay_loops")
  const summary = String(formData.get("summary") ?? "").trim()
  const contentJsonRaw = String(formData.get("contentJson") ?? "")
  const parsed = parseEditorPayload(contentJsonRaw, "tiptap")
  const status = String(formData.get("status") ?? "draft") as DocumentStatus

  if (!documentId || !title) {
    return { error: "Document title is required." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: existing } = await supabase
    .from("design_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle()

  if (!existing) {
    return { error: "Document not found." }
  }

  if (hasDesignContentChanged(existing, parsed.content, parsed.contentJson)) {
    await snapshotDesignDocument(supabase, existing, user?.id ?? null)
  }

  const { error } = await supabase
    .from("design_documents")
    .update({
      title,
      category,
      summary: summary || null,
      content: parsed.content,
      content_json: parsed.contentJson,
      content_format: parsed.contentFormat,
      status,
    })
    .eq("id", documentId)

  if (error) {
    return { error: error.message }
  }

  revalidateDesignPaths(slug, docSlug)
  return { success: "Design document updated." }
}

export async function createLoreEntry(
  _prevState: KnowledgeActionState,
  formData: FormData
): Promise<KnowledgeActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const entrySlugInput = String(formData.get("entrySlug") ?? "").trim()
  const entryType = String(formData.get("entryType") ?? "other") as LoreEntryType
  const summary = String(formData.get("summary") ?? "").trim()
  const content = String(formData.get("content") ?? "").trim()
  const canonStatus = String(formData.get("canonStatus") ?? "draft") as CanonStatus

  if (!workspaceId || !projectId || !name) {
    return { error: "Entry name is required." }
  }

  const entrySlug = entrySlugInput || slugify(name)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entrySlug)) {
    return { error: "Slug must use lowercase letters, numbers, and hyphens." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { error } = await supabase.from("lore_entries").insert({
    workspace_id: workspaceId,
    project_id: projectId,
    name,
    slug: entrySlug,
    entry_type: entryType,
    summary: summary || null,
    content: content || `# ${name}\n\n${summary || ""}`,
    canon_status: canonStatus,
    author_id: user.id,
    created_by: user.id,
  })

  if (error) {
    if (error.message.includes("lore_entries_project_id_slug_key")) {
      return { error: "An entry with this slug already exists." }
    }
    return { error: error.message }
  }

  revalidateLorePaths(slug, entrySlug)
  return { success: "Lore entry created." }
}

export async function updateLoreEntry(
  _prevState: KnowledgeActionState,
  formData: FormData
): Promise<KnowledgeActionState> {
  const entryId = String(formData.get("entryId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const entryType = String(formData.get("entryType") ?? "other") as LoreEntryType
  const summary = String(formData.get("summary") ?? "").trim()
  const contentJsonRaw = String(formData.get("contentJson") ?? "")
  const parsed = parseEditorPayload(contentJsonRaw, "tiptap")
  const canonStatus = String(formData.get("canonStatus") ?? "draft") as CanonStatus

  if (!entryId || !name) {
    return { error: "Entry name is required." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: existing } = await supabase
    .from("lore_entries")
    .select("*")
    .eq("id", entryId)
    .maybeSingle()

  if (!existing) {
    return { error: "Lore entry not found." }
  }

  if (hasLoreContentChanged(existing, parsed.content, parsed.contentJson)) {
    await snapshotLoreEntry(supabase, existing, user?.id ?? null)
  }

  const { error } = await supabase
    .from("lore_entries")
    .update({
      name,
      entry_type: entryType,
      summary: summary || null,
      content: parsed.content,
      content_json: parsed.contentJson,
      content_format: parsed.contentFormat,
      canon_status: canonStatus,
    })
    .eq("id", entryId)

  if (error) {
    return { error: error.message }
  }

  revalidateLorePaths(slug, entrySlug)
  return { success: "Lore entry updated." }
}

export async function restoreDesignDocumentVersion(
  _prevState: KnowledgeActionState,
  formData: FormData
): Promise<KnowledgeActionState> {
  const documentId = String(formData.get("documentId") ?? "")
  const versionId = String(formData.get("versionId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const docSlug = String(formData.get("docSlug") ?? "")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: document }, { data: version }] = await Promise.all([
    supabase.from("design_documents").select("*").eq("id", documentId).maybeSingle(),
    supabase.from("design_document_versions").select("*").eq("id", versionId).maybeSingle(),
  ])

  if (!document || !version || version.document_id !== document.id) {
    return { error: "Version not found." }
  }

  await snapshotDesignDocument(supabase, document, user?.id ?? null)

  const { error } = await supabase
    .from("design_documents")
    .update({
      title: version.title,
      summary: version.summary,
      content: version.content,
      content_json: version.content_json,
      content_format: version.content_format,
      category: version.category,
      status: version.status,
    })
    .eq("id", documentId)

  if (error) {
    return { error: error.message }
  }

  revalidateDesignPaths(slug, docSlug)
  return { success: `Restored version ${version.version_number}.` }
}

export async function restoreLoreEntryVersion(
  _prevState: KnowledgeActionState,
  formData: FormData
): Promise<KnowledgeActionState> {
  const entryId = String(formData.get("entryId") ?? "")
  const versionId = String(formData.get("versionId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: entry }, { data: version }] = await Promise.all([
    supabase.from("lore_entries").select("*").eq("id", entryId).maybeSingle(),
    supabase.from("lore_entry_versions").select("*").eq("id", versionId).maybeSingle(),
  ])

  if (!entry || !version || version.entry_id !== entry.id) {
    return { error: "Version not found." }
  }

  await snapshotLoreEntry(supabase, entry, user?.id ?? null)

  const { error } = await supabase
    .from("lore_entries")
    .update({
      name: version.name,
      summary: version.summary,
      content: version.content,
      content_json: version.content_json,
      content_format: version.content_format,
      entry_type: version.entry_type,
      canon_status: version.canon_status,
    })
    .eq("id", entryId)

  if (error) {
    return { error: error.message }
  }

  revalidateLorePaths(slug, entrySlug)
  return { success: `Restored version ${version.version_number}.` }
}

export async function addLoreRelationship(
  _prevState: KnowledgeActionState,
  formData: FormData
): Promise<KnowledgeActionState> {
  const sourceEntryId = String(formData.get("sourceEntryId") ?? "")
  const targetEntryId = String(formData.get("targetEntryId") ?? "")
  const relationshipType = String(formData.get("relationshipType") ?? "related_to") as LoreRelationshipType
  const label = String(formData.get("label") ?? "").trim() || null
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")

  if (!sourceEntryId || !targetEntryId) {
    return { error: "Select a lore entry to link." }
  }

  if (sourceEntryId === targetEntryId) {
    return { error: "An entry cannot relate to itself." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase.from("lore_entry_relationships").insert({
    source_entry_id: sourceEntryId,
    target_entry_id: targetEntryId,
    relationship_type: relationshipType,
    label,
    created_by: user?.id ?? null,
  })

  if (error) {
    if (error.message.includes("lore_entry_relationships_source_entry_id_target_entry_id_relationship")) {
      return { error: "This relationship already exists." }
    }
    return { error: error.message }
  }

  revalidateLorePaths(slug, entrySlug)
  return { success: "Relationship added." }
}

export async function removeLoreRelationship(
  _prevState: KnowledgeActionState,
  formData: FormData
): Promise<KnowledgeActionState> {
  const relationshipId = String(formData.get("relationshipId") ?? "")
  const slug = String(formData.get("slug") ?? "")
  const entrySlug = String(formData.get("entrySlug") ?? "")

  if (!relationshipId) {
    return { error: "Missing relationship." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("lore_entry_relationships")
    .delete()
    .eq("id", relationshipId)

  if (error) {
    return { error: error.message }
  }

  revalidateLorePaths(slug, entrySlug)
  return { success: "Relationship removed." }
}

export async function seedStarterDesignDocs(projectId: string, slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("seed_starter_design_docs", {
    p_project_id: projectId,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateDesignPaths(slug)
  return { success: `Created ${data ?? 0} starter design documents.` }
}

export async function seedStarterLoreEntries(projectId: string, slug: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("seed_starter_lore_entries", {
    p_project_id: projectId,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateLorePaths(slug)
  return { success: `Created ${data ?? 0} starter lore entries.` }
}
