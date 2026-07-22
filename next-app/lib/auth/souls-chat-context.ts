import { createClient } from "@/lib/supabase/server"
import type { SoulsPrivateConversation, SoulsPrivateMessage } from "@/lib/database.types"

export type SoulsConversationContext = {
  projectSlug: string
  projectId: string
  loreEntrySlug?: string
  loreEntryName?: string
  taskId?: string
}

export async function getOrCreateSoulsConversation(input: {
  workspaceId: string
  userId: string
  projectId: string
  projectSlug: string
}): Promise<SoulsPrivateConversation> {
  const supabase = await createClient()

  const { data: existing } = await supabase
    .from("souls_private_conversations")
    .select("*")
    .eq("workspace_id", input.workspaceId)
    .eq("user_id", input.userId)
    .eq("project_id", input.projectId)
    .maybeSingle()

  if (existing) {
    return existing
  }

  const { data, error } = await supabase
    .from("souls_private_conversations")
    .insert({
      workspace_id: input.workspaceId,
      project_id: input.projectId,
      user_id: input.userId,
      title: "Souls",
    })
    .select("*")
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? "Could not start Souls conversation.")
  }

  return data
}

export async function getSoulsMessages(conversationId: string): Promise<SoulsPrivateMessage[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from("souls_private_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })

  return data ?? []
}

export async function getSoulsLoreAttachment(projectId: string, entrySlug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("lore_entries")
    .select("id, name, slug, entry_type, summary, content")
    .eq("project_id", projectId)
    .eq("slug", entrySlug)
    .maybeSingle()

  return data
}
