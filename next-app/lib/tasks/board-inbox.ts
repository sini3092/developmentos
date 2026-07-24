import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { BoardList } from "@/lib/database.types"

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

export function buildBoardInboxTriagePrompt(input: {
  tasks: Array<
    Pick<
      TaskWithPeople,
      "identifier" | "title" | "progress" | "checklist_done" | "checklist_total" | "status"
    >
  >
  lists: Array<Pick<BoardList, "board_key" | "name">>
}) {
  const cardLines =
    input.tasks.length > 0
      ? input.tasks
          .map(
            (task) =>
              `- ${task.identifier} · ${task.title} (status: ${task.status}, progress: ${task.progress ?? 0}%, checklist: ${task.checklist_done}/${task.checklist_total})`
          )
          .join("\n")
      : "- (Inbox is empty)"

  const listLines = input.lists
    .map((list) => `- ${list.board_key ?? "dev"} / ${list.name}`)
    .join("\n")

  return [
    "Please triage the dev-board **Inbox** list.",
    "",
    "These cards are uncategorized ideas and tasks. Route each one to the correct board and list, or mark it done/deferred if it is already finished or obsolete.",
    "",
    "Rules:",
    "- Use tasks.list first, then tasks.move or tasks.upsert — never create duplicates for the same work.",
    "- dev board: Inbox → Planned / Ready / In Progress / Done / Deferred as appropriate.",
    "- systems board: place feature/system cards in the matching systems list (Core Player, World & Environment, etc.).",
    "- bugs board: real defects only.",
    "- If GAME_STATUS or lore already covers the work and the card is redundant, move to Done or Deferred and add tasks.comment.add explaining why.",
    "- If progress is 100% or status is done, move to Done.",
    "- Leave genuinely unclear cards in Inbox and tell me what you need.",
    "- Work in batches across rounds (done: false) until every card is routed or explained.",
    "",
    `Inbox cards (${input.tasks.length}):`,
    cardLines,
    "",
    "Available lists:",
    listLines,
  ].join("\n")
}
