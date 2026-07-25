"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { runInboxSoulsAgent } from "@/lib/agents/run-inbox-souls-agent"
import {
  archiveInboxThread,
  getOrCreateDirectInboxThread,
  markInboxThreadRead,
} from "@/lib/inbox/threads"
import type { SoulsReportMetadata } from "@/lib/inbox/types"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

export type InboxActionState = {
  error?: string
  success?: string
  threadId?: string
}

function revalidateInbox() {
  revalidatePath("/inbox")
  revalidatePath("/", "layout")
}

export async function sendInboxMessage(
  _prev: InboxActionState,
  formData: FormData
): Promise<InboxActionState> {
  const threadId = String(formData.get("threadId") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const projectSlug = String(formData.get("projectSlug") ?? "")
  const threadKind = String(formData.get("threadKind") ?? "")

  if (!threadId || !body || !workspaceId) {
    return { error: "Message is empty." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { data: thread } = await supabase
    .from("inbox_threads")
    .select("id, kind, project_id, metadata")
    .eq("id", threadId)
    .maybeSingle()

  if (!thread) {
    return { error: "Conversation not found." }
  }

  const { error: insertError } = await supabase.from("inbox_messages").insert({
    thread_id: threadId,
    sender_kind: "user",
    sender_user_id: user.id,
    body,
    status: "complete",
  })

  if (insertError) {
    return { error: insertError.message }
  }

  await supabase
    .from("inbox_threads")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", threadId)

  await markInboxThreadRead(supabase, threadId, user.id)

  if (thread.kind === "souls_report" && projectId && projectSlug) {
    const admin = createAdminClient()
    const { data: assistantMessage, error: assistantError } = await admin
      .from("inbox_messages")
      .insert({
        thread_id: threadId,
        sender_kind: "souls",
        body: "",
        status: "working",
      })
      .select("id")
      .single()

    if (assistantError || !assistantMessage) {
      return { error: assistantError?.message ?? "Could not start Souls reply." }
    }

    after(() =>
      runInboxSoulsAgent({
        threadId,
        assistantMessageId: assistantMessage.id,
        workspaceId,
        projectId,
        projectSlug,
        userId: user.id,
        userPrompt: body,
        reportMetadata: (thread.metadata ?? {}) as SoulsReportMetadata,
      }).finally(() => {
        revalidateInbox()
      })
    )
  } else if (thread.kind === "direct") {
    const { data: members } = await supabase
      .from("inbox_thread_members")
      .select("user_id")
      .eq("thread_id", threadId)

    const peerId = (members ?? []).map((row) => row.user_id).find((id) => id !== user.id)
    if (peerId) {
      await supabase.from("notifications").insert({
        workspace_id: workspaceId,
        user_id: peerId,
        type: "inbox_direct",
        title: "New inbox message",
        body,
        link: `/inbox?t=${threadId}`,
        entity_type: "inbox_thread",
        entity_id: threadId,
      })
    }
  }

  revalidateInbox()
  return { success: "Sent", threadId }
}

export async function archiveInboxThreadAction(threadId: string) {
  const supabase = await createClient()
  await archiveInboxThread(supabase, threadId)
  revalidateInbox()
  return { success: true }
}

export async function archiveSoulsReportThreadsAction(workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { data: memberships } = await supabase
    .from("inbox_thread_members")
    .select("thread_id")
    .eq("user_id", user.id)

  const threadIds = (memberships ?? []).map((row) => row.thread_id)
  if (threadIds.length === 0) {
    return { success: true, archived: 0 }
  }

  const { data: threads } = await supabase
    .from("inbox_threads")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("kind", "souls_report")
    .in("id", threadIds)
    .is("archived_at", null)

  const soulsThreadIds = (threads ?? []).map((thread) => thread.id)
  for (const threadId of soulsThreadIds) {
    await archiveInboxThread(supabase, threadId)
  }

  revalidateInbox()
  return { success: true, archived: soulsThreadIds.length }
}

export async function markInboxThreadReadAction(threadId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  await markInboxThreadRead(supabase, threadId, user.id)
  revalidateInbox()
  return { success: true }
}

export async function startDirectInboxThread(
  _prev: InboxActionState,
  formData: FormData
): Promise<InboxActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const peerUserId = String(formData.get("peerUserId") ?? "")
  const peerName = String(formData.get("peerName") ?? "Teammate")

  if (!workspaceId || !peerUserId) {
    return { error: "Pick a teammate to message." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  if (peerUserId === user.id) {
    return { error: "You cannot message yourself." }
  }

  try {
    const thread = await getOrCreateDirectInboxThread(supabase, {
      workspaceId,
      userId: user.id,
      peerUserId,
      peerName,
    })

    revalidateInbox()
    return { success: "Opened", threadId: thread.id }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not open direct message thread."
    return { error: message }
  }
}
