import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"

type Client = SupabaseClient<Database>

export async function getGithubTokenForProject(
  supabase: Client,
  projectId: string
): Promise<string | null> {
  const { data: project } = await supabase
    .from("projects")
    .select("created_by")
    .eq("id", projectId)
    .maybeSingle()

  if (!project?.created_by) {
    return null
  }

  const { data: ownerConnection } = await supabase
    .from("github_connections")
    .select("access_token")
    .eq("user_id", project.created_by)
    .maybeSingle()

  if (ownerConnection?.access_token) {
    return ownerConnection.access_token
  }

  const { data: members } = await supabase
    .from("project_members")
    .select("user_id")
    .eq("project_id", projectId)

  for (const member of members ?? []) {
    const { data } = await supabase
      .from("github_connections")
      .select("access_token")
      .eq("user_id", member.user_id)
      .maybeSingle()

    if (data?.access_token) {
      return data.access_token
    }
  }

  return null
}

export async function getGithubTokenForProjectAdmin(projectId: string) {
  if (!isAdminClientConfigured()) {
    return null
  }

  const supabase = createAdminClient()
  return getGithubTokenForProject(supabase, projectId)
}
