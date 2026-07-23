"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { runSoulsPrivateAgent } from "@/lib/agents/run-souls-private-agent"
import {
  getOrCreateSoulsConversation,
  getSoulsLoreAttachment,
} from "@/lib/auth/souls-chat-context"
import { recoverStaleSoulsMessages } from "@/lib/souls/stale-messages"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/lib/database.types"

export type SoulsChatActionState = {
  error?: string
  success?: string
  conversationId?: string
  userMessageId?: string
  assistantMessageId?: string
}

export async function sendSoulsPrivateMessage(
  _prevState: SoulsChatActionState,
  formData: FormData
): Promise<SoulsChatActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const projectSlug = String(formData.get("projectSlug") ?? "")
  const body = String(formData.get("body") ?? "").trim()
  const attachLoreSlug = String(formData.get("attachLoreSlug") ?? "").trim()

  if (!workspaceId || !projectId || !projectSlug) {
    return { error: "Open Souls from a project to chat." }
  }

  if (!body) {
    return { error: "Write a message for Souls." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const conversation = await getOrCreateSoulsConversation({
    workspaceId,
    userId: user.id,
    projectId,
    projectSlug,
  })

  await recoverStaleSoulsMessages(supabase, conversation.id)

  const attachedLore = attachLoreSlug
    ? await getSoulsLoreAttachment(projectId, attachLoreSlug)
    : null

  const userMetadata = attachedLore
    ? {
        attachedLore: {
          name: attachedLore.name,
          slug: attachedLore.slug,
          entryType: attachedLore.entry_type,
          summary: attachedLore.summary,
          contentPreview: attachedLore.content.slice(0, 3000),
        },
      }
    : {}

  const { data: userMessage, error: userError } = await supabase
    .from("souls_private_messages")
    .insert({
      conversation_id: conversation.id,
      role: "user",
      body,
      status: "complete",
      metadata: userMetadata,
    })
    .select("id")
    .single()

  if (userError || !userMessage) {
    return { error: userError?.message ?? "Could not send message." }
  }

  const { data: assistantMessage, error: assistantError } = await supabase
    .from("souls_private_messages")
    .insert({
      conversation_id: conversation.id,
      role: "assistant",
      body: "",
      status: "working",
      metadata: { workingLabel: "Souls is thinking…" },
    })
    .select("id")
    .single()

  if (assistantError || !assistantMessage) {
    return { error: assistantError?.message ?? "Could not start Souls reply." }
  }

  after(() =>
    runSoulsPrivateAgent({
      conversationId: conversation.id,
      assistantMessageId: assistantMessage.id,
      workspaceId,
      projectId,
      projectSlug,
      userId: user.id,
      userPrompt: body,
      attachedLore: attachedLore
        ? {
            name: attachedLore.name,
            slug: attachedLore.slug,
            entryType: attachedLore.entry_type,
            summary: attachedLore.summary,
            content: attachedLore.content,
          }
        : undefined,
    })
  )

  revalidatePath(`/projects/${projectSlug}/lore`)
  revalidatePath(`/projects/${projectSlug}/tasks`)

  return {
    success: "Sent",
    conversationId: conversation.id,
    userMessageId: userMessage.id,
    assistantMessageId: assistantMessage.id,
  }
}

export async function cancelSoulsPrivateWork(conversationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { data: conversation } = await supabase
    .from("souls_private_conversations")
    .select("id")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!conversation) {
    return { error: "Conversation not found." }
  }

  await recoverStaleSoulsMessages(supabase, conversationId)

  const { data: working } = await supabase
    .from("souls_private_messages")
    .select("id, metadata")
    .eq("conversation_id", conversationId)
    .eq("status", "working")

  if (!working?.length) {
    return { success: "Souls is ready." }
  }

  for (const message of working) {
    const metadata =
      message.metadata && typeof message.metadata === "object" && !Array.isArray(message.metadata)
        ? (message.metadata as Record<string, unknown>)
        : {}
    const actions = Array.isArray(metadata.actions) ? metadata.actions : []
    const hasActions = actions.length > 0

    await supabase
      .from("souls_private_messages")
      .update({
        body: hasActions
          ? "Stopped by you. The work above was saved — send \"continue\" if Souls should finish."
          : "Stopped by you. Send a new message when you're ready.",
        status: hasActions ? "complete" : "error",
        metadata: JSON.parse(
          JSON.stringify({
            ...metadata,
            workingLabel: undefined,
            recoveredFromStale: true,
          })
        ) as Json,
      })
      .eq("id", message.id)
  }

  return { success: "Souls released." }
}

export async function loadSoulsPrivateChat(projectId: string, projectSlug: string, workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const conversation = await getOrCreateSoulsConversation({
    workspaceId,
    userId: user.id,
    projectId,
    projectSlug,
  })

  await recoverStaleSoulsMessages(supabase, conversation.id)

  const { data: messages } = await supabase
    .from("souls_private_messages")
    .select("*")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: true })

  return {
    conversation,
    messages: messages ?? [],
  }
}
