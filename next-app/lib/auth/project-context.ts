import { notFound, redirect } from "next/navigation"

import type {
  Profile,
  Project,
  ProjectMember,
  ProjectMemberWithProfile,
} from "@/lib/database.types"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"
import { createClient } from "@/lib/supabase/server"

export type ProjectContext = {
  project: Project
  members: ProjectMemberWithProfile[]
  currentMembership: ProjectMember | null
  canManage: boolean
  workspaceMembers: Array<{
    user_id: string
    profile: Profile | null
    workspace_role: string
  }>
}

async function getProjectMembers(projectId: string) {
  const supabase = await createClient()

  const { data: memberRows } = await supabase
    .from("project_members")
    .select("*")
    .eq("project_id", projectId)
    .order("joined_at")

  const memberIds = memberRows?.map((member) => member.user_id) ?? []
  const { data: profileRows } =
    memberIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", memberIds)
      : { data: [] as Profile[] }

  return (
    memberRows?.map((member) => ({
      ...member,
      profile: profileRows?.find((profile) => profile.id === member.user_id) ?? null,
    })) ?? []
  )
}

export async function getProjectBySlug(slug: string): Promise<ProjectContext | null> {
  const workspaceContext = await requireWorkspaceContext()
  const supabase = await createClient()

  const { data: project } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceContext.activeWorkspace!.id)
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle()

  if (!project) {
    return null
  }

  const members = await getProjectMembers(project.id)
  const currentMembership =
    members.find((member) => member.user_id === workspaceContext.user.id) ?? null

  const canManage =
    workspaceContext.activeWorkspace?.role === "owner" ||
    currentMembership?.role === "owner" ||
    currentMembership?.role === "project_lead"

  const memberUserIds = new Set(members.map((member) => member.user_id))
  const workspaceMembers = workspaceContext.members
    .filter((member) => !memberUserIds.has(member.user_id))
    .map((member) => ({
      user_id: member.user_id,
      profile: member.profile,
      workspace_role: member.role,
    }))

  return {
    project,
    members,
    currentMembership,
    canManage,
    workspaceMembers,
  }
}

export async function requireProject(slug: string) {
  const projectContext = await getProjectBySlug(slug)

  if (!projectContext) {
    notFound()
  }

  if (
    !projectContext.currentMembership &&
    projectContext.project.visibility === "private"
  ) {
    const workspaceContext = await requireWorkspaceContext()
    if (workspaceContext.activeWorkspace?.role !== "owner") {
      redirect("/projects")
    }
  }

  return projectContext
}
