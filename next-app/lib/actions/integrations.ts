"use server"

import { createHash, randomBytes } from "node:crypto"
import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"

export type IntegrationActionState = {
  error?: string
  success?: string
}

export async function disconnectGithub(): Promise<IntegrationActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { error } = await supabase
    .from("github_connections")
    .delete()
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: "GitHub disconnected." }
}

export async function updateOpenRouterSettings(
  _prevState: IntegrationActionState,
  formData: FormData
): Promise<IntegrationActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const apiKey = String(formData.get("apiKey") ?? "").trim()
  const model = String(formData.get("model") ?? "google/gemini-2.0-flash-001").trim()

  if (!workspaceId) {
    return { error: "Workspace is required." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { data: membership } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!membership || membership.role !== "owner") {
    return { error: "Only workspace owners can update Souls AI settings." }
  }

  const { error } = await supabase
    .from("workspaces")
    .update({
      openrouter_api_key: apiKey || null,
      openrouter_model: model || "google/gemini-2.0-flash-001",
    })
    .eq("id", workspaceId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: "Souls AI settings saved." }
}

export async function createCodexBridgeToken(
  _prevState: IntegrationActionState
): Promise<IntegrationActionState & { token?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const token = randomBytes(32).toString("hex")
  const tokenHash = createHash("sha256").update(token).digest("hex")

  const { error } = await supabase.from("user_bridge_tokens").insert({
    user_id: user.id,
    token_hash: tokenHash,
    label: "Codex bridge",
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return {
    success: "Bridge token created. Copy it now — it won't be shown again.",
    token,
  }
}

export async function updateCodexSettings(
  _prevState: IntegrationActionState,
  formData: FormData
): Promise<IntegrationActionState> {
  const codexProfile = String(formData.get("codexProfile") ?? "").trim() || null
  const codexModel = String(formData.get("codexModel") ?? "").trim() || null
  const codexWorkspacePath = String(formData.get("codexWorkspacePath") ?? "").trim() || null
  const sessionMode = String(formData.get("sessionMode") ?? "new")
  const normalizedSessionMode = sessionMode === "resume_last" ? "resume_last" : "new"

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { error } = await supabase.from("user_codex_settings").upsert(
    {
      user_id: user.id,
      codex_profile: codexProfile,
      codex_model: codexModel,
      codex_workspace_path: codexWorkspacePath,
      session_mode: normalizedSessionMode,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  )

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: "Codex settings saved." }
}
