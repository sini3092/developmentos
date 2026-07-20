import type { ProjectAutomation } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export async function getProjectAutomations(projectId: string): Promise<ProjectAutomation[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("project_automations")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })

  return data ?? []
}
