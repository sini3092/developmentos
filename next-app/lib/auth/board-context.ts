import type { BoardList } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export async function getProjectBoardLists(projectId: string): Promise<BoardList[]> {
  const supabase = await createClient()

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
