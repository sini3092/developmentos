import { NextResponse } from "next/server"

import { buildAgentProjectContext } from "@/lib/agents/build-project-context"
import { buildChannelTranscript } from "@/lib/agents/build-channel-transcript"
import { authenticateBridgeToken } from "@/lib/bridge/auth"
import { DEFAULT_CODEX_SETTINGS } from "@/lib/codex/types"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  if (!isAdminClientConfigured()) {
    return NextResponse.json({ error: "Bridge API is not configured." }, { status: 503 })
  }

  const auth = await authenticateBridgeToken(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const supabase = createAdminClient()

  const [{ data: jobs, error }, { data: codexSettings }] = await Promise.all([
    supabase
      .from("agent_jobs")
      .select("id, prompt, status, project_id, channel_id, trigger_message_id, created_at")
      .eq("created_by", auth.userId)
      .eq("agent_name", "personal")
      .in("status", ["awaiting_approval", "pending"])
      .order("created_at", { ascending: true })
      .limit(10),
    supabase
      .from("user_codex_settings")
      .select("codex_profile, codex_model, codex_workspace_path, codex_command, session_mode")
      .eq("user_id", auth.userId)
      .maybeSingle(),
  ])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const projectIds = [...new Set((jobs ?? []).map((job) => job.project_id))]
  const channelIds = [...new Set((jobs ?? []).map((job) => job.channel_id))]

  const [{ data: projects }, { data: channels }] = await Promise.all([
    projectIds.length > 0
      ? supabase
          .from("projects")
          .select("id, slug, workspace_id")
          .in("id", projectIds)
      : Promise.resolve({ data: [] as Array<{ id: string; slug: string; workspace_id: string }> }),
    channelIds.length > 0
      ? supabase.from("project_channels").select("id, slug").in("id", channelIds)
      : Promise.resolve({ data: [] as Array<{ id: string; slug: string }> }),
  ])

  const projectSlugById = new Map((projects ?? []).map((project) => [project.id, project.slug]))
  const projectWorkspaceById = new Map(
    (projects ?? []).map((project) => [project.id, project.workspace_id])
  )
  const channelSlugById = new Map((channels ?? []).map((channel) => [channel.id, channel.slug]))

  const projectContextById = new Map<string, string>()
  const channelTranscriptById = new Map<string, string>()
  await Promise.all([
    ...projectIds.map(async (projectId) => {
      const workspaceId = projectWorkspaceById.get(projectId)
      if (!workspaceId) return
      projectContextById.set(
        projectId,
        await buildAgentProjectContext(supabase, projectId, workspaceId)
      )
    }),
    ...channelIds.map(async (channelId) => {
      channelTranscriptById.set(
        channelId,
        await buildChannelTranscript(supabase, channelId, { limit: 30 })
      )
    }),
  ])

  const settings = codexSettings
    ? {
        codex_profile: codexSettings.codex_profile,
        codex_model: codexSettings.codex_model,
        codex_workspace_path: codexSettings.codex_workspace_path,
        codex_command: codexSettings.codex_command,
        session_mode:
          codexSettings.session_mode === "resume_last" ? "resume_last" : "new",
      }
    : DEFAULT_CODEX_SETTINGS

  return NextResponse.json({
    codex_settings: settings,
    jobs: (jobs ?? []).map((job) => ({
      id: job.id,
      prompt: job.prompt,
      status: job.status,
      project_id: job.project_id,
      channel_id: job.channel_id,
      trigger_message_id: job.trigger_message_id,
      created_at: job.created_at,
      project_slug: projectSlugById.get(job.project_id) ?? null,
      channel_slug: channelSlugById.get(job.channel_id) ?? null,
      project_context: projectContextById.get(job.project_id) ?? null,
      channel_transcript: channelTranscriptById.get(job.channel_id) ?? null,
    })),
  })
}
