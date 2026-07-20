import { notFound } from "next/navigation"

import type {
  DecisionDetail,
  DecisionLink,
  DecisionWithOwner,
  Profile,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

async function attachOwners<T extends { owner_id: string | null }>(
  rows: T[]
): Promise<Array<T & { owner: Profile | null }>> {
  if (rows.length === 0) {
    return []
  }

  const supabase = await createClient()
  const ownerIds = [...new Set(rows.map((row) => row.owner_id).filter(Boolean))] as string[]
  const { data: profiles } =
    ownerIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", ownerIds)
      : { data: [] as Profile[] }

  return rows.map((row) => ({
    ...row,
    owner: profiles?.find((profile) => profile.id === row.owner_id) ?? null,
  }))
}

async function resolveDecisionLinks(
  projectSlug: string,
  links: DecisionLink[]
): Promise<DecisionDetail["links"]> {
  if (links.length === 0) {
    return []
  }

  const supabase = await createClient()
  const resolved: DecisionDetail["links"] = []

  const taskIds = links.filter((link) => link.link_type === "task").map((link) => link.linked_id)
  const docIds = links
    .filter((link) => link.link_type === "design_document")
    .map((link) => link.linked_id)
  const loreIds = links.filter((link) => link.link_type === "lore_entry").map((link) => link.linked_id)
  const initiativeIds = links
    .filter((link) => link.link_type === "initiative")
    .map((link) => link.linked_id)

  const [{ data: tasks }, { data: docs }, { data: lore }, { data: initiatives }] = await Promise.all([
    taskIds.length > 0
      ? supabase.from("tasks").select("id, title, identifier").in("id", taskIds)
      : Promise.resolve({ data: [] }),
    docIds.length > 0
      ? supabase.from("design_documents").select("id, title, slug").in("id", docIds)
      : Promise.resolve({ data: [] }),
    loreIds.length > 0
      ? supabase.from("lore_entries").select("id, name, slug").in("id", loreIds)
      : Promise.resolve({ data: [] }),
    initiativeIds.length > 0
      ? supabase.from("initiatives").select("id, name, slug").in("id", initiativeIds)
      : Promise.resolve({ data: [] }),
  ])

  for (const link of links) {
    if (link.link_type === "task") {
      const task = tasks?.find((row) => row.id === link.linked_id)
      if (task) {
        resolved.push({
          ...link,
          title: task.title,
          href: `/projects/${projectSlug}/tasks?task=${task.id}`,
        })
      }
    } else if (link.link_type === "design_document") {
      const doc = docs?.find((row) => row.id === link.linked_id)
      if (doc) {
        resolved.push({
          ...link,
          title: doc.title,
          href: `/projects/${projectSlug}/design/${doc.slug}`,
        })
      }
    } else if (link.link_type === "lore_entry") {
      const entry = lore?.find((row) => row.id === link.linked_id)
      if (entry) {
        resolved.push({
          ...link,
          title: entry.name,
          href: `/projects/${projectSlug}/lore/${entry.slug}`,
        })
      }
    } else if (link.link_type === "initiative") {
      const initiative = initiatives?.find((row) => row.id === link.linked_id)
      if (initiative) {
        resolved.push({
          ...link,
          title: initiative.name,
          href: `/projects/${projectSlug}/roadmap/${initiative.slug}`,
        })
      }
    }
  }

  return resolved
}

export async function getDecisions(projectId: string): Promise<DecisionWithOwner[]> {
  const supabase = await createClient()

  const { data: decisions } = await supabase
    .from("decisions")
    .select("*")
    .eq("project_id", projectId)
    .order("updated_at", { ascending: false })

  return attachOwners(decisions ?? [])
}

export async function getDecision(
  projectId: string,
  projectSlug: string,
  decisionSlug: string
): Promise<DecisionDetail | null> {
  const supabase = await createClient()

  const { data: decision } = await supabase
    .from("decisions")
    .select("*")
    .eq("project_id", projectId)
    .eq("slug", decisionSlug)
    .maybeSingle()

  if (!decision) {
    return null
  }

  const [withOwner] = await attachOwners([decision])

  const { data: links } = await supabase
    .from("decision_links")
    .select("*")
    .eq("decision_id", decision.id)

  return {
    ...withOwner,
    links: await resolveDecisionLinks(projectSlug, links ?? []),
  }
}

export async function requireDecision(
  projectId: string,
  projectSlug: string,
  decisionSlug: string
): Promise<DecisionDetail> {
  const decision = await getDecision(projectId, projectSlug, decisionSlug)
  if (!decision) {
    notFound()
  }
  return decision
}

export async function getProjectTasksForLinking(projectId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from("tasks")
    .select("id, title, identifier")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .order("updated_at", { ascending: false })
    .limit(100)

  return data ?? []
}
