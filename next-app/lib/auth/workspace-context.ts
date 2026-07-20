import { cookies } from "next/headers"
import { cache } from "react"
import { redirect } from "next/navigation"

import type {
  MemberWithProfile,
  Profile,
  ProjectWithMembership,
  Workspace,
  WorkspaceInvitation,
  WorkspaceWithRole,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { getUnreadNotificationCount } from "@/lib/auth/notification-context"
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/utils/format"

export type WorkspaceContext = {
  user: {
    id: string
    email: string
  }
  profile: Profile | null
  workspaces: WorkspaceWithRole[]
  activeWorkspace: WorkspaceWithRole | null
  members: MemberWithProfile[]
  pendingInvitations: WorkspaceInvitation[]
  projects: ProjectWithMembership[]
  canCreateProjects: boolean
  unreadNotificationCount: number
}

export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
  }
})

export const getWorkspaceContext = cache(async (): Promise<WorkspaceContext | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return null
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()

  const { data: memberships } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)

  const workspaceIds = memberships?.map((membership) => membership.workspace_id) ?? []

  const { data: workspaceRows } =
    workspaceIds.length > 0
      ? await supabase.from("workspaces").select("*").in("id", workspaceIds)
      : { data: [] as Workspace[] }

  const workspaces =
    workspaceRows
      ?.map((workspace) => {
        const membership = memberships?.find(
          (item) => item.workspace_id === workspace.id
        )

        if (!membership) {
          return null
        }

        return {
          ...workspace,
          role: membership.role,
        }
      })
      .filter((workspace): workspace is WorkspaceWithRole => workspace !== null)
      .sort((a, b) => a.name.localeCompare(b.name)) ?? []

  const cookieStore = await cookies()
  const activeSlug = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value
  const activeWorkspace =
    workspaces.find((workspace) => workspace.slug === activeSlug) ??
    workspaces[0] ??
    null

  let members: MemberWithProfile[] = []
  let pendingInvitations: WorkspaceInvitation[] = []
  let projects: ProjectWithMembership[] = []

  if (activeWorkspace) {
    const [memberResult, projects, invitationsResult, unreadNotificationCount] = await Promise.all([
      supabase.from("workspace_members").select("*").eq("workspace_id", activeWorkspace.id),
      fetchWorkspaceProjects(activeWorkspace.id, user.id),
      activeWorkspace.role === "owner" || activeWorkspace.role === "project_lead"
        ? supabase
            .from("workspace_invitations")
            .select("*")
            .eq("workspace_id", activeWorkspace.id)
            .is("accepted_at", null)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as WorkspaceInvitation[] }),
      getUnreadNotificationCount(activeWorkspace.id, user.id),
    ])

    const memberRows = memberResult.data
    const memberIds = memberRows?.map((member) => member.user_id) ?? []
    const { data: profileRows } =
      memberIds.length > 0
        ? await supabase.from("profiles").select("*").in("id", memberIds)
        : { data: [] as Profile[] }

    members =
      memberRows?.map((member) => ({
        ...member,
        profile: profileRows?.find((item) => item.id === member.user_id) ?? null,
      })) ?? []

    pendingInvitations = invitationsResult.data ?? []
    // projects assigned above

    return {
      user: {
        id: user.id,
        email: user.email,
      },
      profile,
      workspaces,
      activeWorkspace,
      members,
      pendingInvitations,
      projects,
      canCreateProjects:
        activeWorkspace.role === "owner" || activeWorkspace.role === "project_lead",
      unreadNotificationCount,
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
    workspaces,
    activeWorkspace,
    members,
    pendingInvitations,
    projects,
    canCreateProjects: false,
    unreadNotificationCount: 0,
  }
})

export async function requireWorkspaceContext() {
  const context = await getWorkspaceContext()

  if (!context) {
    redirect("/auth/sign-in")
  }

  if (context.workspaces.length === 0) {
    redirect("/onboarding/create-workspace")
  }

  return context
}

async function fetchWorkspaceProjects(workspaceId: string, userId: string) {
  const supabase = await createClient()

  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")
    .order("name")

  if (!projects?.length) {
    return [] as ProjectWithMembership[]
  }

  const projectIds = projects.map((project) => project.id)
  const { data: memberships } = await supabase
    .from("project_members")
    .select("*")
    .eq("user_id", userId)
    .in("project_id", projectIds)

  return projects.map((project) => ({
    ...project,
    membership:
      memberships?.find((membership) => membership.project_id === project.id) ??
      null,
  }))
}
