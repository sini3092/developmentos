import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

import { authenticateBridgeToken } from "@/lib/bridge/auth"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  if (!isAdminClientConfigured()) {
    return NextResponse.json({ error: "Bridge API is not configured." }, { status: 503 })
  }

  const auth = await authenticateBridgeToken(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const { id } = await context.params
  const body = (await request.json()) as {
    status?: "running" | "completed" | "failed"
    result?: string
    error?: string
  }

  if (!body.status) {
    return NextResponse.json({ error: "status is required." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { data: job, error: jobError } = await supabase
    .from("agent_jobs")
    .select("id, created_by, channel_id, trigger_message_id, status, project_id")
    .eq("id", id)
    .maybeSingle()

  if (jobError || !job) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 })
  }

  if (job.created_by !== auth.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const [{ data: project }, { data: channel }] = await Promise.all([
    supabase.from("projects").select("slug").eq("id", job.project_id).maybeSingle(),
    supabase.from("project_channels").select("slug").eq("id", job.channel_id).maybeSingle(),
  ])

  const projectSlug = project?.slug ?? null
  const channelSlug = channel?.slug ?? null

  const updates: {
    status: string
    result?: string | null
    error?: string | null
    updated_at: string
  } = {
    status: body.status,
    updated_at: new Date().toISOString(),
  }

  if (body.status === "completed") {
    updates.result = body.result?.trim() || "Work completed."
    updates.error = null
  }

  if (body.status === "failed") {
    updates.error = body.error?.trim() || "Codex failed."
    updates.result = null
  }

  const { error: updateError } = await supabase.from("agent_jobs").update(updates).eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (body.status === "running") {
    await supabase.rpc("post_agent_channel_message", {
      p_channel_id: job.channel_id,
      p_body: "Personal (Codex) picked up your request and is working on it now.",
      p_agent_name: "personal",
      p_parent_message_id: job.trigger_message_id,
    })
  }

  if (body.status === "completed") {
    await supabase.rpc("post_agent_channel_message", {
      p_channel_id: job.channel_id,
      p_body: `Personal (Codex) finished.\n\n${updates.result}`,
      p_agent_name: "personal",
      p_parent_message_id: job.trigger_message_id,
    })
  }

  if (body.status === "failed") {
    await supabase.rpc("post_agent_channel_message", {
      p_channel_id: job.channel_id,
      p_body: `Personal (Codex) could not complete the job: ${updates.error}`,
      p_agent_name: "personal",
      p_parent_message_id: job.trigger_message_id,
    })
  }

  if (projectSlug && channelSlug) {
    revalidatePath(`/projects/${projectSlug}/channels/${channelSlug}`)
    revalidatePath(`/projects/${projectSlug}/channels`)
  }

  return NextResponse.json({ ok: true })
}
