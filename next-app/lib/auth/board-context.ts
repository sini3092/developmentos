import type { BoardList } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export async function ensureProjectBoardLists(projectId: string) {
  const supabase = await createClient()
  await supabase.rpc("ensure_project_board_lists", { p_project_id: projectId })
}

export async function getProjectBoardLists(projectId: string): Promise<BoardList[]> {
  const supabase = await createClient()

  await supabase.rpc("ensure_project_board_lists", { p_project_id: projectId })

  const { data, error } = await supabase
    .from("board_lists")
    .select("*")
    .eq("project_id", projectId)
    .order("position", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}
