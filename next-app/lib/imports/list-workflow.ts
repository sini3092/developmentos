import type { BoardKey } from "@/lib/constants/board-keys"
import type { BoardListColor } from "@/lib/constants/board-lists"
import type { TaskStatus } from "@/lib/database.types"

const DEV_LIST_STATUS: Record<string, TaskStatus> = {
  Inbox: "backlog",
  Planned: "backlog",
  Ready: "ready",
  "In Progress": "in_progress",
  "Needs Testing": "in_review",
  Blocked: "blocked",
  Done: "done",
  Deferred: "cancelled",
}

const DEV_LIST_COLORS: Record<string, BoardListColor> = {
  Inbox: "slate",
  Planned: "blue",
  Ready: "green",
  "In Progress": "yellow",
  "Needs Testing": "purple",
  Blocked: "red",
  Done: "green",
  Deferred: "slate",
}

const BUGS_LIST_COLORS: Record<string, BoardListColor> = {
  New: "red",
  Confirmed: "yellow",
  "In Progress": "blue",
  "Needs Retest": "purple",
  Fixed: "green",
  "Won't Fix / Deferred": "slate",
}

const SYSTEMS_LIST_COLORS: Record<string, BoardListColor> = {
  "Core Player": "blue",
  "World & Environment": "green",
  "Gathering & Resources": "yellow",
  "Inventory & Crafting": "purple",
  "Building & Settlement": "red",
  "Rekindled & NPCs": "blue",
  "Combat & Progression": "red",
  "Quests & Narrative": "purple",
  "UI, HUD & Menus": "blue",
  Audio: "green",
  "Save, Tools & Technical": "slate",
  "Animals & Farming": "yellow",
}

const ROADMAP_LIST_COLORS: Record<string, BoardListColor> = {
  "Prototype Stabilization": "yellow",
  "Core Survival Loop": "green",
  "Settlement Foundation": "blue",
  "Combat Foundation": "red",
  "World Atmosphere": "purple",
  "Content Expansion": "blue",
  "Vertical Slice": "green",
  "Later / Post-Prototype": "slate",
}

const LORE_LIST_COLORS: Record<string, BoardListColor> = {
  "World Rules": "purple",
  Regions: "green",
  Characters: "blue",
  Factions: "red",
  History: "slate",
  Creatures: "yellow",
  "Items & Artifacts": "purple",
  "Quests & Story": "blue",
  "Needs Review": "yellow",
  Canon: "green",
}

export function resolveListColor(boardKey: BoardKey | null | undefined, listName: string): BoardListColor {
  if (boardKey === "dev") return DEV_LIST_COLORS[listName] ?? "slate"
  if (boardKey === "bugs") return BUGS_LIST_COLORS[listName] ?? "slate"
  if (boardKey === "systems") return SYSTEMS_LIST_COLORS[listName] ?? "slate"
  if (boardKey === "roadmap") return ROADMAP_LIST_COLORS[listName] ?? "slate"
  if (boardKey === "lore") return LORE_LIST_COLORS[listName] ?? "slate"
  return "slate"
}

export function resolveStatusFromList(
  boardKey: BoardKey | null | undefined,
  listName: string,
  explicit?: TaskStatus | null
): TaskStatus {
  if (explicit) {
    return explicit
  }
  if (boardKey === "dev") {
    return DEV_LIST_STATUS[listName] ?? "backlog"
  }
  if (boardKey === "bugs") {
    if (listName === "Fixed") return "done"
    if (listName === "In Progress") return "in_progress"
    if (listName === "Won't Fix / Deferred") return "cancelled"
    return "backlog"
  }
  return "backlog"
}

const DEV_STATUS_TO_LIST: Partial<Record<TaskStatus, string>> = {
  backlog: "Planned",
  ready: "Ready",
  in_progress: "In Progress",
  in_review: "Needs Testing",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Deferred",
}

export function resolveListForStatus(
  boardKey: BoardKey,
  status: TaskStatus
): string | null {
  if (boardKey !== "dev") {
    return null
  }

  return DEV_STATUS_TO_LIST[status] ?? null
}

export const DONE_SYSTEM_CHECKLIST = [
  { title: "Playable in current build", completed: true },
] as const

export const PARTIAL_SYSTEM_CHECKLIST = [
  { title: "Implementation work remaining", completed: false },
] as const
