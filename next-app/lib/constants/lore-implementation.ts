import type { LoreImplementationStatus } from "@/lib/database.types"

export const LORE_IMPLEMENTATION_STATUSES: LoreImplementationStatus[] = [
  "not_started",
  "planned",
  "in_progress",
  "implemented",
  "needs_update",
]

export const LORE_IMPLEMENTATION_STATUS_LABELS: Record<LoreImplementationStatus, string> = {
  not_started: "Not started",
  planned: "Planned",
  in_progress: "In progress",
  implemented: "Implemented",
  needs_update: "Needs update",
}

export const LORE_IMPLEMENTATION_STATUS_HINTS: Record<LoreImplementationStatus, string> = {
  not_started: "Lore exists but no implementation work tracked yet.",
  planned: "Scheduled for development but not started.",
  in_progress: "Actively being built in the game.",
  implemented: "Reflected in the current build.",
  needs_update: "Game changed — lore or implementation is out of sync.",
}
