import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"

import { authenticateBridgeToken } from "@/lib/bridge/auth"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"

type RouteContext = {
  params: Promise<{ id: string }>
}

async function getJobContext(supabase: ReturnType<typeof createAdminClient>, id: string, userId: string) {
  const { data: job, error: jobError } = await supabase
    .from("agent_jobs")
    .select("id, created_by, channel_id, trigger_message_id, status, project_id")
    .eq("id", id)
    .maybeSingle()

  if (jobError || !job || job.created_by !== userId) {
    return null
  }

  const [{ data: project }, { data: channel }] = await Promise.all([
    supabase.from("projects").select("slug").eq("id", job.project_id).maybeSingle(),
    supabase.from("project_channels").select("slug").eq("id", job.channel_id).maybeSingle(),
  ])

  return {
    job,
    projectSlug: project?.slug ?? null,
    channelSlug: channel?.slug ?? null,
  }
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
    status?: "running" | "progress" | "completed" | "failed"
    result?: string
    error?: string
    progress?: string
    codex_session_id?: string
  }

  if (!body.status) {
    return NextResponse.json({ error: "status is required." }, { status: 400 })
  }

  const supabase = createAdminClient()
  const contextData = await getJobContext(supabase, id, auth.userId)

  if (!contextData) {
    return NextResponse.json({ error: "Job not found." }, { status: 404 })
  }

  const { job, projectSlug, channelSlug } = contextData

  if (body.status === "progress") {
    const message = body.progress?.trim()
    if (message) {
      await supabase.rpc("post_agent_channel_message", {
        p_channel_id: job.channel_id,
        p_body: message.slice(0, 4000),
        p_agent_name: "personal",
        p_parent_message_id: job.trigger_message_id,
      })
    }

    if (body.codex_session_id) {
      await supabase
        .from("agent_jobs")
        .update({
          codex_session_id: body.codex_session_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
    }

    if (projectSlug && channelSlug) {
      revalidatePath(`/projects/${projectSlug}/channels/${channelSlug}`)
    }

    return NextResponse.json({ ok: true })
  }

  const updates: {
    status: string
    result?: string | null
    error?: string | null
    codex_session_id?: string | null
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

  if (body.codex_session_id) {
    updates.codex_session_id = body.codex_session_id
  }

  const { error: updateError } = await supabase.from("agent_jobs").update(updates).eq("id", id)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  if (body.status === "running") {
    const profileNote = body.progress?.trim()
    const { error: messageError } = await supabase.rpc("post_agent_channel_message", {
      p_channel_id: job.channel_id,
      p_body:
        profileNote ||
        "Personal (Codex) picked up your request and started a session on your PC.",
      p_agent_name: "personal",
      p_parent_message_id: job.trigger_message_id,
    })

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 })
    }
  }

  if (body.status === "completed") {
    const result = updates.result ?? "Work completed."
    const { error: messageError } = await supabase.rpc("post_agent_channel_message", {
      p_channel_id: job.channel_id,
      p_body: `Personal (Codex) finished.\n\n${result}`.slice(0, 12000),
      p_agent_name: "personal",
      p_parent_message_id: job.trigger_message_id,
    })

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 })
    }
  }

  if (body.status === "failed") {
    const { error: messageError } = await supabase.rpc("post_agent_channel_message", {
      p_channel_id: job.channel_id,
      p_body: `Personal (Codex) could not complete the job: ${updates.error}`,
      p_agent_name: "personal",
      p_parent_message_id: job.trigger_message_id,
    })

    if (messageError) {
      return NextResponse.json({ error: messageError.message }, { status: 500 })
    }
  }

  if (projectSlug && channelSlug) {
    revalidatePath(`/projects/${projectSlug}/channels/${channelSlug}`)
    revalidatePath(`/projects/${projectSlug}/channels`)
  }

  return NextResponse.json({ ok: true })
}
