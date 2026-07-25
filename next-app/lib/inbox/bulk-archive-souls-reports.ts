import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"

type Client = SupabaseClient<Database>

export async function bulkArchiveSoulsReportThreads(input: {
  workspaceId: string
  userId?: string
}) {
  const admin = isAdminClientConfigured() ? createAdminClient() : null
  const client = admin ?? (null as Client | null)

  if (!client) {
    throw new Error("Bulk archive is not configured.")
  }

  const archivedAt = new Date().toISOString()

  let query = client
    .from("inbox_threads")
    .update({ archived_at: archivedAt })
    .eq("workspace_id", input.workspaceId)
    .eq("kind", "souls_report")
    .is("archived_at", null)
    .select("id")

  const { data: archivedThreads, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  const archivedIds = (archivedThreads ?? []).map((thread) => thread.id)

  if (archivedIds.length > 0 && input.userId) {
    await client
      .from("notifications")
      .update({ read_at: archivedAt })
      .eq("user_id", input.userId)
      .eq("entity_type", "inbox_thread")
      .in("entity_id", archivedIds)
      .is("read_at", null)
  }

  return archivedIds.length
}
