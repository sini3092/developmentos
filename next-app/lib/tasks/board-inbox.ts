import type { SupabaseClient } from "@supabase/supabase-js"

import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { BoardList, Database } from "@/lib/database.types"
import type { SoulsActionResult } from "@/lib/souls/message-metadata"

export function isBoardInboxList(list: Pick<BoardList, "name" | "board_key">) {
  return list.board_key === "dev" && list.name.trim().toLowerCase() === "inbox"
}

export function findDoneListForBoard(lists: BoardList[], boardKey: string | null) {
  const key = boardKey ?? "dev"
  return (
    lists.find((list) => list.board_key === key && list.name === "Done") ??
    lists.find((list) => list.name === "Done") ??
    null
  )
}

export type BoardInboxTriageProgress = {
  total: number
  movedOut: number
  stayingWithComment: number
  unaddressed: Array<{ id: string; identifier: string; title: string }>
  isComplete: boolean
}

export async function getBoardInboxTriageProgress(
  supabase: SupabaseClient<Database>,
  inboxListId: string,
  inboxTaskIds: string[],
  actionResults: SoulsActionResult[]
): Promise<BoardInboxTriageProgress> {
  if (inboxTaskIds.length === 0) {
    return {
      total: 0,
      movedOut: 0,
      stayingWithComment: 0,
      unaddressed: [],
      isComplete: true,
    }
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, identifier, title, list_id")
    .in("id", inboxTaskIds)
    .is("deleted_at", null)

  const commentedTaskIds = new Set<string>()
  for (const result of actionResults) {
    if (result.tool !== "tasks.comment.add" || result.status !== "success") {
      continue
    }
    const taskId =
      result.after && typeof result.after.taskId === "string" ? result.after.taskId : undefined
    if (taskId) {
      commentedTaskIds.add(taskId)
    }
  }

  const stillInInbox = (tasks ?? []).filter((task) => task.list_id === inboxListId)
  const movedOut = (tasks ?? []).length - stillInInbox.length
  const unaddressed = stillInInbox
    .filter((task) => !commentedTaskIds.has(task.id))
    .map((task) => ({
      id: task.id,
      identifier: task.identifier,
      title: task.title,
    }))

  return {
    total: inboxTaskIds.length,
    movedOut,
    stayingWithComment: stillInInbox.length - unaddressed.length,
    unaddressed,
    isComplete: unaddressed.length === 0,
  }
}

export function formatBoardInboxTriageProgressBlock(progress: BoardInboxTriageProgress) {
  const lines = [
    `Triage progress: ${progress.movedOut}/${progress.total} moved out of Inbox, ${progress.stayingWithComment} staying with comment, ${progress.unaddressed.length} still need action.`,
  ]

  if (progress.unaddressed.length > 0) {
    lines.push(
      "",
      "Cards still needing tasks.move or tasks.comment.add:",
      ...progress.unaddressed.map(
        (task) => `- taskId: ${task.id} · ${task.identifier} · ${task.title}`
      )
    )
  }

  return lines.join("\n")
}

export function boardInboxTriageMaxRounds(inboxCount: number) {
  return Math.min(30, Math.max(12, Math.ceil(inboxCount * 1.5) + 4))
}

export function isBoardInboxTriageContinueMessage(message: string) {
  const normalized = message.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  return /^(continue|fortsett|gå videre|ga videre|kjør videre|kjor videre|fullfør triage|fullfor triage|triage videre|ferdig med inbox|fortsett triage)([.!?\s]|$)/i.test(
    normalized
  )
}

export type DevInboxTriageBatch = {
  inboxListId: string
  lists: Array<Pick<BoardList, "id" | "board_key" | "name">>
  tasks: Array<
    Pick<
      TaskWithPeople,
      "id" | "identifier" | "title" | "progress" | "checklist_done" | "checklist_total" | "status"
    >
  >
}

export async function loadDevInboxTriageBatch(
  supabase: SupabaseClient<Database>,
  projectId: string
): Promise<DevInboxTriageBatch | null> {
  const { data: lists } = await supabase
    .from("board_lists")
    .select("id, name, board_key")
    .eq("project_id", projectId)
    .order("position")

  const inboxList = (lists ?? []).find((list) => isBoardInboxList(list))
  if (!inboxList) {
    return null
  }

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, identifier, title, status, progress, list_id")
    .eq("project_id", projectId)
    .eq("list_id", inboxList.id)
    .is("deleted_at", null)
    .order("board_position")

  if (!tasks?.length) {
    return null
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

  return {
    inboxListId: inboxList.id,
    lists: lists ?? [],
    tasks: tasksWithChecklist,
  }
}

export async function conversationHasRecentBoardInboxTriage(
  supabase: SupabaseClient<Database>,
  conversationId: string
) {
  const { data: messages } = await supabase
    .from("souls_private_messages")
    .select("metadata, body")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(40)

  return (messages ?? []).some((message) => {
    const metadata =
      message.metadata && typeof message.metadata === "object" && !Array.isArray(message.metadata)
        ? (message.metadata as Record<string, unknown>)
        : null

    if (metadata?.source === "board_inbox_triage" || metadata?.source === "board_inbox_triage_continue") {
      return true
    }

    const body = typeof message.body === "string" ? message.body : ""
    return /still unaddressed|finish triage|triage the dev-board \*\*inbox\*\*|souls is triaging your inbox/i.test(
      body
    )
  })
}

export async function resolveBoardInboxTriageContinuation(
  supabase: SupabaseClient<Database>,
  input: {
    conversationId: string
    projectId: string
    userMessage: string
  }
) {
  if (!isBoardInboxTriageContinueMessage(input.userMessage)) {
    return null
  }

  const hadTriage = await conversationHasRecentBoardInboxTriage(supabase, input.conversationId)
  if (!hadTriage) {
    return null
  }

  const batch = await loadDevInboxTriageBatch(supabase, input.projectId)
  if (!batch) {
    return null
  }

  return {
    inboxListId: batch.inboxListId,
    inboxTaskIds: batch.tasks.map((task) => task.id),
    prompt: buildBoardInboxTriageContinuePrompt(batch),
  }
}

export function buildBoardInboxTriageContinuePrompt(batch: DevInboxTriageBatch) {
  return [
    "Continue **board Inbox triage** — finish routing the remaining cards below.",
    "",
    "Important:",
    "- This is still **board Inbox triage**, not lore work.",
    "- Do NOT use lore.* or docs.sync — only tasks.move and tasks.comment.add.",
    "- Do NOT re-read lore entries because a card title sounds like lore.",
    "- Process every remaining card in this message.",
    "",
    buildBoardInboxTriagePrompt({
      tasks: batch.tasks,
      lists: batch.lists,
    }),
  ].join("\n")
}

export function buildBoardInboxTriagePrompt(input: {
  tasks: Array<
    Pick<
      TaskWithPeople,
      "id" | "identifier" | "title" | "progress" | "checklist_done" | "checklist_total" | "status"
    >
  >
  lists: Array<Pick<BoardList, "id" | "board_key" | "name">>
}) {
  const cardLines =
    input.tasks.length > 0
      ? input.tasks
          .map(
            (task) =>
              `- taskId: ${task.id} · ${task.identifier} · ${task.title} (status: ${task.status}, progress: ${task.progress ?? 0}%, checklist: ${task.checklist_done}/${task.checklist_total})`
          )
          .join("\n")
      : "- (Inbox is empty)"

  const listLines = input.lists
    .map((list) => `- listId: ${list.id} · ${list.board_key ?? "dev"} / ${list.name}`)
    .join("\n")

  return [
    "Please triage the dev-board **Inbox** list.",
    "",
    "These cards are uncategorized ideas and tasks. You must review **every** card in this batch.",
    "",
    "For each card, do exactly one of:",
    "1. **tasks.move** — route it to the correct board/list (preferred for almost all cards).",
    "2. **tasks.comment.add** — only if it must stay in Inbox; explain clearly what is missing or unclear.",
    "",
    "Rules:",
    "- Do NOT use lore.* or docs.sync during Inbox triage.",
    "- Prefer tasks.move over tasks.list — route cards directly using the listId values below.",
    "- Listing or analyzing alone is not enough — every card needs tasks.move or tasks.comment.add.",
    "- Use taskId (preferred) or identifier, plus boardKey + listName (or listId) on every tasks.move.",
    "- Pack as many tasks.move actions as possible per round (up to 15) until the batch is complete.",
    "- dev board: Inbox → Planned / Ready / In Progress / Done / Deferred as appropriate.",
    "- systems board: place feature/system cards in the matching systems list.",
    "- bugs board: real defects only.",
    "- If progress is 100% or status is done, move to Done.",
    "- Set done: true **only** when all cards are moved out of Inbox or have a stay-in-Inbox comment.",
    "- In your final reply, summarize **every** card: where it went, or why it stays in Inbox.",
    "",
    `Inbox cards (${input.tasks.length}) — process all of them:`,
    cardLines,
    "",
    "Available lists:",
    listLines,
  ].join("\n")
}
