"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type { ProjectRole, ProjectVisibility } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { slugify } from "@/lib/utils/format"
import { parseGithubRepoUrl } from "@/lib/utils/github"

export type ProjectActionState = {
  error?: string
  success?: string
}

export async function createProject(
  _prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const slugInput = String(formData.get("slug") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const color = String(formData.get("color") ?? "blue")
  const visibility = String(formData.get("visibility") ?? "workspace") as ProjectVisibility
  const githubInput = String(formData.get("githubRepoUrl") ?? "").trim()
  const slug = slugInput || slugify(name)

  if (!workspaceId || !name) {
    return { error: "Project name is required." }
  }

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { error: "Slug must use lowercase letters, numbers, and hyphens." }
  }

  const githubRepo = githubInput ? parseGithubRepoUrl(githubInput) : null
  if (githubInput && !githubRepo) {
    return {
      error: "Enter a valid GitHub repository URL (e.g. https://github.com/owner/repo).",
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_project_with_owner", {
    ws_id: workspaceId,
    project_name: name,
    project_slug: slug,
    project_description: description || null,
    project_color: color,
    project_visibility: visibility,
    project_github_repo_url: githubRepo?.url ?? null,
    project_github_owner: githubRepo?.owner ?? null,
    project_github_repo_name: githubRepo?.name ?? null,
  })

  if (error) {
    if (error.message.includes("projects_workspace_id_slug_key")) {
      return { error: "A project with this URL already exists." }
    }
    return { error: error.message }
  }

  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", data)
    .single()

  revalidatePath("/projects")
  redirect(project?.slug ? `/projects/${project.slug}` : "/projects")
}

export async function seedStarterProjects(workspaceId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("seed_starter_projects", {
    ws_id: workspaceId,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/projects")
  return { success: `Created ${data ?? 0} starter projects.` }
}

export async function updateProject(
  _prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const projectId = String(formData.get("projectId") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const color = String(formData.get("color") ?? "blue")
  const visibility = String(formData.get("visibility") ?? "workspace") as ProjectVisibility
  const githubInput = String(formData.get("githubRepoUrl") ?? "").trim()

  if (!projectId || !name) {
    return { error: "Project name is required." }
  }

  const githubRepo = githubInput ? parseGithubRepoUrl(githubInput) : null
  if (githubInput && !githubRepo) {
    return {
      error: "Enter a valid GitHub repository URL (e.g. https://github.com/owner/repo).",
    }
  }

  const supabase = await createClient()
  const { data: project, error } = await supabase
    .from("projects")
    .update({
      name,
      description: description || null,
      color,
      visibility,
      github_repo_url: githubRepo?.url ?? null,
      github_owner: githubRepo?.owner ?? null,
      github_repo_name: githubRepo?.name ?? null,
    })
    .eq("id", projectId)
    .select("slug")
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/projects")
  revalidatePath(`/projects/${project.slug}`)
  revalidatePath(`/projects/${project.slug}/settings`)
  return { success: "Project updated." }
}

export async function archiveProject(projectId: string, slug: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("projects")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
    })
    .eq("id", projectId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/projects")
  redirect("/projects")
}

export async function addProjectMember(
  _prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const projectId = String(formData.get("projectId") ?? "")
  const userId = String(formData.get("userId") ?? "")
  const role = String(formData.get("role") ?? "team_member") as ProjectRole
  const slug = String(formData.get("slug") ?? "")

  if (!projectId || !userId) {
    return { error: "Select a workspace member to add." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("project_members").insert({
    project_id: projectId,
    user_id: userId,
    role,
  })

  if (error) {
    if (error.message.includes("project_members_project_id_user_id_key")) {
      return { error: "This member is already on the project." }
    }
    return { error: error.message }
  }

  revalidatePath(`/projects/${slug}`)
  revalidatePath(`/projects/${slug}/settings`)
  return { success: "Member added to project." }
}

export async function updateProjectMemberRole(
  _prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const memberId = String(formData.get("memberId") ?? "")
  const role = String(formData.get("role") ?? "team_member") as ProjectRole
  const slug = String(formData.get("slug") ?? "")

  if (!memberId) {
    return { error: "Member is required." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("project_members")
    .update({ role })
    .eq("id", memberId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${slug}/settings`)
  return { success: "Member role updated." }
}

export async function removeProjectMember(memberId: string, slug: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("id", memberId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/projects/${slug}/settings`)
  return { success: "Member removed from project." }
}
