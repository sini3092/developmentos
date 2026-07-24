import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import type { InboxMessage, InboxThread, InboxThreadListItem } from "@/lib/inbox/types"

type Client = SupabaseClient<Database>

function orderedPeerPair(a: string, b: string) {
  return a < b ? { low: a, high: b } : { low: b, high: a }
}

export async function getInboxThreads(
  supabase: Client,
  workspaceId: string,
  userId: string
): Promise<InboxThreadListItem[]> {
  const { data: memberships } = await supabase
    .from("inbox_thread_members")
    .select("thread_id, last_read_at")
    .eq("user_id", userId)

  const threadIds = (memberships ?? []).map((row) => row.thread_id)
  if (threadIds.length === 0) {
    return []
  }

  const lastReadByThread = new Map(
    (memberships ?? []).map((row) => [row.thread_id, row.last_read_at])
  )

  const { data: threads } = await supabase
    .from("inbox_threads")
    .select("*")
    .eq("workspace_id", workspaceId)
    .in("id", threadIds)
    .is("archived_at", null)
    .order("last_message_at", { ascending: false })

  if (!threads?.length) {
    return []
  }

  const projectIds = [...new Set(threads.map((thread) => thread.project_id).filter(Boolean))] as string[]
  const peerIds = new Set<string>()
  for (const thread of threads) {
    if (thread.kind === "direct") {
      if (thread.direct_peer_a && thread.direct_peer_a !== userId) peerIds.add(thread.direct_peer_a)
      if (thread.direct_peer_b && thread.direct_peer_b !== userId) peerIds.add(thread.direct_peer_b)
    }
  }

  const [{ data: projects }, { data: profiles }, { data: latestMessages }] = await Promise.all([
    projectIds.length
      ? supabase.from("projects").select("id, name, slug").in("id", projectIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; slug: string }> }),
    peerIds.size
      ? supabase.from("profiles").select("id, display_name").in("id", [...peerIds])
      : Promise.resolve({ data: [] as Array<{ id: string; display_name: string | null }> }),
    supabase
      .from("inbox_messages")
      .select("thread_id, body, created_at, sender_kind")
      .in(
        "thread_id",
        threads.map((thread) => thread.id)
      )
      .order("created_at", { ascending: false }),
  ])

  const projectById = new Map((projects ?? []).map((project) => [project.id, project]))
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  const previewByThread = new Map<string, string>()
  const latestAtByThread = new Map<string, string>()

  for (const message of latestMessages ?? []) {
    if (!previewByThread.has(message.thread_id)) {
      previewByThread.set(message.thread_id, message.body)
      latestAtByThread.set(message.thread_id, message.created_at)
    }
  }

  return threads.map((thread) => {
    const lastRead = lastReadByThread.get(thread.id)
    const latestAt = latestAtByThread.get(thread.id) ?? thread.last_message_at
    const unread = !lastRead || new Date(latestAt) > new Date(lastRead)
    const peerId =
      thread.kind === "direct"
        ? thread.direct_peer_a === userId
          ? thread.direct_peer_b
          : thread.direct_peer_a
        : null
    const project = thread.project_id ? projectById.get(thread.project_id) : null

    return {
      ...(thread as InboxThread),
      preview: previewByThread.get(thread.id) ?? "",
      unread,
      peer_id: peerId,
      peer_name: peerId ? (profileById.get(peerId)?.display_name ?? "Teammate") : null,
      project_slug: project?.slug ?? null,
      project_name: project?.name ?? null,
    }
  })
}

export async function getInboxMessages(supabase: Client, threadId: string) {
  const { data } = await supabase
    .from("inbox_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })

  return (data ?? []) as InboxMessage[]
}

export async function markInboxThreadRead(supabase: Client, threadId: string, userId: string) {
  await supabase
    .from("inbox_thread_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("user_id", userId)
}

export async function archiveInboxThread(supabase: Client, threadId: string) {
  await supabase
    .from("inbox_threads")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", threadId)
}

export async function getOrCreateDirectInboxThread(
  supabase: Client,
  input: {
    workspaceId: string
    userId: string
    peerUserId: string
    peerName: string
  }
) {
  const { low, high } = orderedPeerPair(input.userId, input.peerUserId)

  const { data: existing } = await supabase
    .from("inbox_threads")
    .select("*")
    .eq("workspace_id", input.workspaceId)
    .eq("kind", "direct")
    .eq("direct_peer_a", low)
    .eq("direct_peer_b", high)
    .is("archived_at", null)
    .maybeSingle()

  if (existing) {
    return existing as InboxThread
  }

  const { data: thread, error } = await supabase
    .from("inbox_threads")
    .insert({
      workspace_id: input.workspaceId,
      kind: "direct",
      title: input.peerName,
      direct_peer_a: low,
      direct_peer_b: high,
    })
    .select("*")
    .single()

  if (error || !thread) {
    throw new Error(error?.message ?? "Could not start direct message thread.")
  }

  const memberRows = [
    { thread_id: thread.id, user_id: input.userId },
    { thread_id: thread.id, user_id: input.peerUserId },
  ]

  const { error: memberError } = await supabase.from("inbox_thread_members").insert(memberRows)
  if (memberError) {
    throw new Error(memberError.message)
  }

  return thread as InboxThread
}

export async function getInboxUnreadCount(supabase: Client, workspaceId: string, userId: string) {
  const threads = await getInboxThreads(supabase, workspaceId, userId)
  return threads.filter((thread) => thread.unread).length
}
