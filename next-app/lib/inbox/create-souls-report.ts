import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json } from "@/lib/database.types"

type AdminClient = SupabaseClient<Database>

export async function createSoulsInboxReport(
  supabase: AdminClient,
  input: {
    workspaceId: string
    projectId: string
    projectName: string
    userId: string
    title: string
    body: string
    metadata: Record<string, unknown>
  }
) {
  const { count } = await supabase
    .from("inbox_threads")
    .select("id", { count: "exact", head: true })
    .eq("project_id", input.projectId)
    .eq("kind", "souls_report")

  const reportNumber = (count ?? 0) + 1
  const threadTitle = `Souls report #${reportNumber} · ${input.projectName}`

  const { data: thread, error: threadError } = await supabase
    .from("inbox_threads")
    .insert({
      workspace_id: input.workspaceId,
      kind: "souls_report",
      project_id: input.projectId,
      title: threadTitle,
      souls_report_number: reportNumber,
      metadata: input.metadata as Json,
      last_message_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (threadError || !thread) {
    throw new Error(threadError?.message ?? "Could not create Souls inbox thread.")
  }

  const { error: memberError } = await supabase.from("inbox_thread_members").insert({
    thread_id: thread.id,
    user_id: input.userId,
  })

  if (memberError) {
    throw new Error(memberError.message)
  }

  const { error: messageError } = await supabase.from("inbox_messages").insert({
    thread_id: thread.id,
    sender_kind: "souls",
    body: input.body,
    metadata: {
      title: input.title,
      report_number: reportNumber,
      ...input.metadata,
    },
    status: "complete",
  })

  if (messageError) {
    throw new Error(messageError.message)
  }

  return { threadId: thread.id, reportNumber }
}
