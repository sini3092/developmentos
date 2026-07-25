"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { runSoulsPrivateAgent } from "@/lib/agents/run-souls-private-agent"
import {
  getOrCreateSoulsConversation,
} from "@/lib/auth/souls-chat-context"
import {
  buildBoardInboxTriagePrompt,
  loadDevInboxTriageBatch,
} from "@/lib/tasks/board-inbox"
import { recoverStaleSoulsMessages } from "@/lib/souls/stale-messages"
import { createClient } from "@/lib/supabase/server"

export type BoardInboxActionState = {
  error?: string
  success?: string
  conversationId?: string
}

export async function triageDevInboxWithSouls(
  _prev: BoardInboxActionState,
  formData: FormData
): Promise<BoardInboxActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const projectSlug = String(formData.get("projectSlug") ?? "")

  if (!workspaceId || !projectId || !projectSlug) {
    return { error: "Open the task board from a project first." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const batch = await loadDevInboxTriageBatch(supabase, projectId)
  if (!batch) {
    return { error: "Inbox is empty — nothing to triage." }
  }

  const prompt = buildBoardInboxTriagePrompt({
    tasks: batch.tasks,
    lists: batch.lists,
  })

  const conversation = await getOrCreateSoulsConversation({
    workspaceId,
    userId: user.id,
    projectId,
    projectSlug,
  })

  await recoverStaleSoulsMessages(supabase, conversation.id)

  const { data: userMessage, error: userError } = await supabase
    .from("souls_private_messages")
    .insert({
      conversation_id: conversation.id,
      role: "user",
      body: prompt,
      status: "complete",
      metadata: { source: "board_inbox_triage", inboxCount: batch.tasks.length },
    })
    .select("id")
    .single()

  if (userError || !userMessage) {
    return { error: userError?.message ?? "Could not start Souls triage." }
  }

  const { data: assistantMessage, error: assistantError } = await supabase
    .from("souls_private_messages")
    .insert({
      conversation_id: conversation.id,
      role: "assistant",
      body: "",
      status: "working",
      metadata: { workingLabel: "Souls is triaging the Inbox…" },
    })
    .select("id")
    .single()

  if (assistantError || !assistantMessage) {
    return { error: assistantError?.message ?? "Could not start Souls triage." }
  }

  const taskIds = batch.tasks.map((task) => task.id)

  after(() =>
    runSoulsPrivateAgent({
      conversationId: conversation.id,
      assistantMessageId: assistantMessage.id,
      workspaceId,
      projectId,
      projectSlug,
      userId: user.id,
      userPrompt: prompt,
      agentMode: "board_inbox_triage",
      inboxTaskIds: taskIds,
      inboxListId: batch.inboxListId,
    })
  )

  revalidatePath(`/projects/${projectSlug}/tasks/board`)
  revalidatePath(`/projects/${projectSlug}/tasks`)

  return {
    success: "Souls is triaging the Inbox.",
    conversationId: conversation.id,
  }
}
