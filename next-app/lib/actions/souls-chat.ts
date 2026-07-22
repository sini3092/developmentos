"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { runSoulsPrivateAgent } from "@/lib/agents/run-souls-private-agent"
import {
  getOrCreateSoulsConversation,
  getSoulsLoreAttachment,
} from "@/lib/auth/souls-chat-context"
import { createClient } from "@/lib/supabase/server"

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
