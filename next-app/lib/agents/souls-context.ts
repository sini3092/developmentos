import { buildAgentProjectContext } from "@/lib/agents/build-project-context"
import { createClient } from "@/lib/supabase/server"

export async function buildSoulsProjectContext(projectId: string, workspaceId: string) {
  const supabase = await createClient()
  return buildAgentProjectContext(supabase, projectId, workspaceId)
}
