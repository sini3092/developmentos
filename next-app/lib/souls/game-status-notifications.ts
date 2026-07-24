import type { SupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

import { createSoulsInboxReport } from "@/lib/inbox/create-souls-report"
import type { Database } from "@/lib/database.types"
import { processPushQueue } from "@/lib/push/send"

type Client = SupabaseClient<Database>

export async function notifyProjectMembersSoulsGameStatus(
  supabase: Client,
  input: {
    workspaceId: string
    projectId: string
    projectSlug: string
    projectName: string
    title: string
    body: string
    metadata: Record<string, unknown>
  }
) {
  const { data: members } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", input.projectId)

  const userIds = new Set((members ?? []).map((member) => member.user_id))

  const { data: project } = await supabase
    .from("projects")
    .select("created_by, name")
    .eq("id", input.projectId)
    .maybeSingle()

  if (project?.created_by) {
    userIds.add(project.created_by)
  }

  if (userIds.size === 0) {
    return 0
  }

  const projectName = input.projectName || project?.name || "Project"
  let created = 0

  for (const userId of userIds) {
    const { threadId, reportNumber } = await createSoulsInboxReport(supabase, {
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      projectName,
      userId,
      title: input.title,
      body: input.body,
      metadata: input.metadata,
    })

    const { error } = await supabase.from("notifications").insert({
      workspace_id: input.workspaceId,
      user_id: userId,
      type: "souls_game_status",
      title: input.title,
      body: `Souls report #${reportNumber} · ${projectName}`,
      link: `/inbox?t=${threadId}`,
      entity_type: "inbox_thread",
      entity_id: threadId,
    })

    if (!error) {
      created += 1
    }
  }

  revalidatePath("/inbox")
  revalidatePath("/", "layout")

  await processPushQueue()

  return created
}
