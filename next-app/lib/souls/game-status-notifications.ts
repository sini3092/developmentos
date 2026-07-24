import type { SupabaseClient } from "@supabase/supabase-js"
import { revalidatePath } from "next/cache"

import type { Database } from "@/lib/database.types"
import { processPushQueue } from "@/lib/push/send"

type Client = SupabaseClient<Database>

export async function notifyProjectMembersSoulsGameStatus(
  supabase: Client,
  input: {
    workspaceId: string
    projectId: string
    projectSlug: string
    title: string
    body: string
  }
) {
  const { data: members } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", input.projectId)

  const userIds = new Set((members ?? []).map((member) => member.user_id))

  const { data: project } = await supabase
    .from("projects")
    .select("created_by")
    .eq("id", input.projectId)
    .maybeSingle()

  if (project?.created_by) {
    userIds.add(project.created_by)
  }

  if (userIds.size === 0) {
    return 0
  }

  const rows = [...userIds].map((userId) => ({
    workspace_id: input.workspaceId,
    user_id: userId,
    type: "souls_game_status" as const,
    title: input.title,
    body: input.body,
    link: `/projects/${input.projectSlug}/tasks/board`,
    entity_type: "project",
    entity_id: input.projectId,
  }))

  const { error } = await supabase.from("notifications").insert(rows)
  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/inbox")
  revalidatePath("/", "layout")

  await processPushQueue()

  return rows.length
}
