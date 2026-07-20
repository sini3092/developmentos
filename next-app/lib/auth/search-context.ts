import type { Profile } from "@/lib/database.types"
import type { SearchResult, SearchResultType } from "@/lib/search/types"
import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/utils/format"

export type { SearchResult, SearchResultType } from "@/lib/search/types"
export { getSearchTypeLabel } from "@/lib/search/types"

export type SearchOptions = {
  type?: SearchResultType
  projectSlug?: string
  limit?: number
}

function escapeIlike(value: string) {
  return value.replace(/[%_\\]/g, "\\$&")
}

async function getActiveWorkspaceId() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, workspaceId: null as string | null }
  }

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)

  const workspaceIds = memberships?.map((membership) => membership.workspace_id) ?? []
  if (workspaceIds.length === 0) {
    return { supabase, workspaceId: null }
  }

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, slug")
    .in("id", workspaceIds)

  const cookieStore = await cookies()
  const activeSlug = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value
  const activeWorkspace =
    workspaces?.find((workspace) => workspace.slug === activeSlug) ?? workspaces?.[0]

  return { supabase, workspaceId: activeWorkspace?.id ?? null }
}

export async function searchWorkspace(query: string, options: SearchOptions = {}) {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return [] as SearchResult[]
  }

  const { supabase, workspaceId } = await getActiveWorkspaceId()
  if (!workspaceId) {
    return []
  }

  const type = options.type ?? "all"
  const perTypeLimit = options.limit ?? 8
  const pattern = `%${escapeIlike(trimmed)}%`
  const results: SearchResult[] = []

  let projectQuery = supabase
    .from("projects")
    .select("id, name, slug")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")

  if (options.projectSlug) {
    projectQuery = projectQuery.eq("slug", options.projectSlug)
  }

  const { data: projects } = await projectQuery
  const projectList = projects ?? []
  const projectIds = projectList.map((project) => project.id)
  const projectById = new Map(projectList.map((project) => [project.id, project]))

  if (projectIds.length === 0 && type !== "project" && type !== "member") {
    return []
  }

  const include = (target: Exclude<SearchResultType, "all">) =>
    type === "all" || type === target

  if (include("project")) {
    const { data } = await supabase
      .from("projects")
      .select("id, name, slug, description")
      .eq("workspace_id", workspaceId)
      .neq("status", "archived")
      .or(`name.ilike.${pattern},slug.ilike.${pattern},description.ilike.${pattern}`)
      .limit(perTypeLimit)

    for (const project of data ?? []) {
      results.push({
        id: project.id,
        type: "project",
        title: project.name,
        subtitle: "Project",
        href: `/projects/${project.slug}`,
      })
    }
  }

  if (include("task") && projectIds.length > 0) {
    const { data } = await supabase
      .from("tasks")
      .select("id, title, identifier, project_id")
      .in("project_id", projectIds)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .or(`title.ilike.${pattern},identifier.ilike.${pattern},description.ilike.${pattern}`)
      .limit(perTypeLimit)

    for (const task of data ?? []) {
      const project = projectById.get(task.project_id)
      if (!project) continue
      results.push({
        id: task.id,
        type: "task",
        title: task.title,
        subtitle: `${task.identifier} · ${project.name}`,
        href: `/projects/${project.slug}/tasks?task=${task.id}`,
      })
    }
  }

  if (include("initiative") && projectIds.length > 0) {
    const { data } = await supabase
      .from("initiatives")
      .select("id, name, slug, project_id")
      .in("project_id", projectIds)
      .neq("status", "cancelled")
      .or(`name.ilike.${pattern},summary.ilike.${pattern}`)
      .limit(perTypeLimit)

    for (const initiative of data ?? []) {
      const project = projectById.get(initiative.project_id)
      if (!project) continue
      results.push({
        id: initiative.id,
        type: "initiative",
        title: initiative.name,
        subtitle: `Initiative · ${project.name}`,
        href: `/projects/${project.slug}/roadmap/${initiative.slug}`,
      })
    }
  }

  if (include("milestone") && projectIds.length > 0) {
    const { data } = await supabase
      .from("milestones")
      .select("id, name, slug, project_id")
      .in("project_id", projectIds)
      .neq("status", "cancelled")
      .or(`name.ilike.${pattern},description.ilike.${pattern}`)
      .limit(perTypeLimit)

    for (const milestone of data ?? []) {
      const project = projectById.get(milestone.project_id)
      if (!project) continue
      results.push({
        id: milestone.id,
        type: "milestone",
        title: milestone.name,
        subtitle: `Milestone · ${project.name}`,
        href: `/projects/${project.slug}/milestones`,
      })
    }
  }

  if (include("design") && projectIds.length > 0) {
    const { data } = await supabase
      .from("design_documents")
      .select("id, title, slug, project_id, summary")
      .in("project_id", projectIds)
      .neq("status", "archived")
      .or(`title.ilike.${pattern},summary.ilike.${pattern},content.ilike.${pattern}`)
      .limit(perTypeLimit)

    for (const doc of data ?? []) {
      const project = projectById.get(doc.project_id)
      if (!project) continue
      results.push({
        id: doc.id,
        type: "design",
        title: doc.title,
        subtitle: `Design · ${project.name}`,
        href: `/projects/${project.slug}/design/${doc.slug}`,
      })
    }
  }

  if (include("lore") && projectIds.length > 0) {
    const { data } = await supabase
      .from("lore_entries")
      .select("id, name, slug, project_id, summary")
      .in("project_id", projectIds)
      .neq("canon_status", "archived")
      .or(`name.ilike.${pattern},summary.ilike.${pattern},content.ilike.${pattern}`)
      .limit(perTypeLimit)

    for (const entry of data ?? []) {
      const project = projectById.get(entry.project_id)
      if (!project) continue
      results.push({
        id: entry.id,
        type: "lore",
        title: entry.name,
        subtitle: `Lore · ${project.name}`,
        href: `/projects/${project.slug}/lore/${entry.slug}`,
      })
    }
  }

  if (include("channel") && projectIds.length > 0) {
    const { data } = await supabase
      .from("project_channels")
      .select("id, name, slug, project_id, description")
      .in("project_id", projectIds)
      .or(`name.ilike.${pattern},description.ilike.${pattern}`)
      .limit(perTypeLimit)

    for (const channel of data ?? []) {
      const project = projectById.get(channel.project_id)
      if (!project) continue
      results.push({
        id: channel.id,
        type: "channel",
        title: channel.name,
        subtitle: `Channel · ${project.name}`,
        href: `/projects/${project.slug}/channels/${channel.slug}`,
      })
    }
  }

  if (include("asset") && projectIds.length > 0) {
    const { data } = await supabase
      .from("assets")
      .select("id, name, slug, project_id, description")
      .in("project_id", projectIds)
      .neq("status", "archived")
      .or(`name.ilike.${pattern},description.ilike.${pattern},engine_path.ilike.${pattern}`)
      .limit(perTypeLimit)

    for (const asset of data ?? []) {
      const project = projectById.get(asset.project_id)
      if (!project) continue
      results.push({
        id: asset.id,
        type: "asset",
        title: asset.name,
        subtitle: `Asset · ${project.name}`,
        href: `/projects/${project.slug}/assets/${asset.slug}`,
      })
    }
  }

  if (include("decision") && projectIds.length > 0) {
    const { data } = await supabase
      .from("decisions")
      .select("id, title, slug, project_id, problem, context")
      .in("project_id", projectIds)
      .or(`title.ilike.${pattern},problem.ilike.${pattern},context.ilike.${pattern}`)
      .limit(perTypeLimit)

    for (const decision of data ?? []) {
      const project = projectById.get(decision.project_id)
      if (!project) continue
      results.push({
        id: decision.id,
        type: "decision",
        title: decision.title,
        subtitle: `Decision · ${project.name}`,
        href: `/projects/${project.slug}/decisions/${decision.slug}`,
      })
    }
  }

  if (include("member")) {
    const { data: memberRows } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)

    const memberIds = memberRows?.map((member) => member.user_id) ?? []
    if (memberIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", memberIds)
        .ilike("display_name", pattern)
        .limit(perTypeLimit)

      for (const profile of (profiles ?? []) as Pick<Profile, "id" | "display_name">[]) {
        results.push({
          id: profile.id,
          type: "member",
          title: profile.display_name ?? "Member",
          subtitle: "Team member",
          href: "/team",
        })
      }
    }
  }

  return results
}

export async function getSearchProjects(workspaceId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("projects")
    .select("id, name, slug")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .order("name")

  return data ?? []
}
