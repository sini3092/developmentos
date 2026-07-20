import { NextResponse } from "next/server"

import { authenticateBridgeToken } from "@/lib/bridge/auth"
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
  const { data: jobs, error } = await supabase
    .from("agent_jobs")
    .select("id, prompt, status, project_id, channel_id, trigger_message_id, created_at")
    .eq("created_by", auth.userId)
    .eq("agent_name", "personal")
    .in("status", ["awaiting_approval", "pending"])
    .order("created_at", { ascending: true })
    .limit(10)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const projectIds = [...new Set((jobs ?? []).map((job) => job.project_id))]
  const channelIds = [...new Set((jobs ?? []).map((job) => job.channel_id))]

  const [{ data: projects }, { data: channels }] = await Promise.all([
    projectIds.length > 0
      ? supabase.from("projects").select("id, slug").in("id", projectIds)
      : Promise.resolve({ data: [] as Array<{ id: string; slug: string }> }),
    channelIds.length > 0
      ? supabase.from("project_channels").select("id, slug").in("id", channelIds)
      : Promise.resolve({ data: [] as Array<{ id: string; slug: string }> }),
  ])

  const projectSlugById = new Map((projects ?? []).map((project) => [project.id, project.slug]))
  const channelSlugById = new Map((channels ?? []).map((channel) => [channel.id, channel.slug]))

  return NextResponse.json({
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
    })),
  })
}
