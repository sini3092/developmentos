"use server"

import { after } from "next/server"
import { revalidatePath } from "next/cache"

import { runSoulsPrivateAgent } from "@/lib/agents/run-souls-private-agent"
import {
  getOrCreateSoulsConversation,
} from "@/lib/auth/souls-chat-context"
import { buildBoardInboxTriagePrompt, isBoardInboxList } from "@/lib/tasks/board-inbox"
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

  const { data: lists } = await supabase
    .from("board_lists")
    .select("id, name, board_key")
    .eq("project_id", projectId)
    .order("position")

  const inboxList = (lists ?? []).find((list) => isBoardInboxList(list))
  if (!inboxList) {
    return { error: "No dev Inbox list found on this project." }
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, identifier, title, status, progress, list_id")
    .eq("project_id", projectId)
    .eq("list_id", inboxList.id)
    .is("deleted_at", null)
    .order("board_position")

  if (!tasks?.length) {
    return { error: "Inbox is empty — nothing to triage." }
  }

  const taskIds = tasks.map((task) => task.id)
  const { data: checklistItems } = await supabase
    .from("task_checklist_items")
    .select("task_id, completed")
    .in("task_id", taskIds)

  const checklistByTask = new Map<string, { done: number; total: number }>()
  for (const item of checklistItems ?? []) {
    const current = checklistByTask.get(item.task_id) ?? { done: 0, total: 0 }
    current.total += 1
    if (item.completed) current.done += 1
    checklistByTask.set(item.task_id, current)
  }

  const tasksWithChecklist = tasks.map((task) => {
    const checklist = checklistByTask.get(task.id) ?? { done: 0, total: 0 }
    return {
      ...task,
      checklist_done: checklist.done,
      checklist_total: checklist.total,
    }
  })

  const prompt = buildBoardInboxTriagePrompt({
    tasks: tasksWithChecklist,
    lists: lists ?? [],
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
      metadata: { source: "board_inbox_triage", inboxCount: tasks.length },
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
      inboxListId: inboxList.id,
    })
  )

  revalidatePath(`/projects/${projectSlug}/tasks/board`)
  revalidatePath(`/projects/${projectSlug}/tasks`)

  return {
    success: "Souls is triaging the Inbox.",
    conversationId: conversation.id,
  }
}
