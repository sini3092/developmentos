"use server"

import { revalidatePath } from "next/cache"

import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { WorkspaceRole } from "@/lib/database.types"

export type MemberActionState = {
  error?: string
  success?: string
}

export async function createWorkspaceMember(
  _prevState: MemberActionState,
  formData: FormData
): Promise<MemberActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const email = String(formData.get("email") ?? "").trim().toLowerCase()
  const displayName = String(formData.get("displayName") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const role = String(formData.get("role") ?? "team_member") as WorkspaceRole

  if (!workspaceId || !email || !displayName || !password) {
    return { error: "All fields are required." }
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." }
  }

  if (role === "owner") {
    return { error: "Use the CLI to create additional owners." }
  }

  if (!isAdminClientConfigured()) {
    return {
      error:
        "User provisioning is not configured. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.",
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (membership?.role !== "owner") {
    return { error: "Only workspace owners can create member accounts." }
  }

  const admin = createAdminClient()

  const { data: existingUsers } = await admin.auth.admin.listUsers()
  const existing = existingUsers.users.find(
    (account) => account.email?.toLowerCase() === email
  )

  let memberUserId = existing?.id

  if (!memberUserId) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        must_change_password: true,
      },
    })

    if (createError) {
      return { error: createError.message }
    }

    memberUserId = created.user.id
  } else {
    await admin.from("profiles").update({ display_name: displayName }).eq("id", memberUserId)
  }

  const { error: memberError } = await admin.from("workspace_members").upsert(
    {
      workspace_id: workspaceId,
      user_id: memberUserId,
      role,
    },
    { onConflict: "workspace_id,user_id" }
  )

  if (memberError) {
    return { error: memberError.message }
  }

  revalidatePath("/team")
  revalidatePath("/settings")

  return {
    success: existing
      ? `${email} already had an account and was added to the workspace.`
      : `Created ${email}. Share the sign-in credentials securely.`,
  }
}
