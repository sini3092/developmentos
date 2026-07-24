import { createClient } from "@/lib/supabase/server"
import { getInboxMessages, getInboxThreads } from "@/lib/inbox/threads"
import type { InboxMessage, InboxThreadListItem } from "@/lib/inbox/types"

export async function getInboxView(workspaceId: string, userId: string) {
  const supabase = await createClient()
  const threads = await getInboxThreads(supabase, workspaceId, userId)
  return { threads }
}

export async function getInboxThreadDetail(threadId: string, userId: string) {
  const supabase = await createClient()
  const { data: thread } = await supabase
    .from("inbox_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle()

  if (!thread) {
    return null
  }

  const messages = await getInboxMessages(supabase, threadId)

  const project = thread.project_id
    ? await supabase
        .from("projects")
        .select("id, name, slug")
        .eq("id", thread.project_id)
        .maybeSingle()
    : { data: null }

  let peerName: string | null = null
  if (thread.kind === "direct") {
    const peerId =
      thread.direct_peer_a === userId ? thread.direct_peer_b : thread.direct_peer_a
    if (peerId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", peerId)
        .maybeSingle()
      peerName = profile?.display_name ?? "Teammate"
    }
  }

  return {
    thread: thread as InboxThreadListItem,
    messages: messages as InboxMessage[],
    project: project.data,
    peerName,
  }
}
