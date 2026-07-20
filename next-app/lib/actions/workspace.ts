"use server"

import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { createClient } from "@/lib/supabase/server"
import type { WorkspaceRole } from "@/lib/database.types"
import { ACTIVE_WORKSPACE_COOKIE, slugify } from "@/lib/utils/format"

export type WorkspaceActionState = {
  error?: string
  success?: string
}

export async function createWorkspace(
  _prevState: WorkspaceActionState,
  formData: FormData
): Promise<WorkspaceActionState> {
  const name = String(formData.get("name") ?? "").trim()
  const slugInput = String(formData.get("slug") ?? "").trim()
  const slug = slugInput || slugify(name)

  if (!name) {
    return { error: "Workspace name is required." }
  }

  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { error: "Slug must use lowercase letters, numbers, and hyphens." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc("create_workspace_with_owner", {
    ws_name: name,
    ws_slug: slug,
  })

  if (error) {
    if (error.message.includes("workspaces_slug_key")) {
      return { error: "That workspace URL is already taken." }
    }
    return { error: error.message }
  }

  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, slug, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  })

  revalidatePath("/", "layout")
  redirect("/")
}

export async function setActiveWorkspace(slug: string) {
  const cookieStore = await cookies()
  cookieStore.set(ACTIVE_WORKSPACE_COOKIE, slug, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
  })

  revalidatePath("/", "layout")
}

export async function inviteWorkspaceMember(
  _prevState: WorkspaceActionState,
  formData: FormData
): Promise<WorkspaceActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const role = String(formData.get("role") ?? "team_member") as WorkspaceRole
  const workspaceId = String(formData.get("workspaceId") ?? "")

  if (!email || !workspaceId) {
    return { error: "Email and workspace are required." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in to invite members." }
  }

  const { error } = await supabase.from("workspace_invitations").insert({
    workspace_id: workspaceId,
    email,
    role,
    invited_by: user.id,
  })

  if (error) {
    if (error.message.includes("workspace_invitations_workspace_id_email_key")) {
      return { error: "An invitation for this email already exists." }
    }
    return { error: error.message }
  }

  revalidatePath("/team")
  revalidatePath("/settings")
  return { success: `Invitation sent to ${email}.` }
}

export async function acceptInvitation(token: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("accept_workspace_invitation", {
    invite_token: token,
  })

  if (error) {
    return { error: error.message }
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("slug")
    .eq("id", data)
    .single()

  if (workspace?.slug) {
    const cookieStore = await cookies()
    cookieStore.set(ACTIVE_WORKSPACE_COOKIE, workspace.slug, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    })
  }

  revalidatePath("/", "layout")
  redirect("/")
}
