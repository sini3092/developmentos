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
  return Math.min(20, Math.max(8, Math.ceil(inboxCount / 4) + 4))
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
    "- Listing or analyzing alone is not enough — every card needs tasks.move or tasks.comment.add.",
    "- Use taskId (preferred) or identifier, plus boardKey + listName (or listId) on every tasks.move.",
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
