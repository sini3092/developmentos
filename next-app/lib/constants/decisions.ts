import type { DecisionLinkType, DecisionStatus } from "@/lib/database.types"

export const DECISION_STATUSES: DecisionStatus[] = [
  "proposed",
  "discussing",
  "accepted",
  "rejected",
  "superseded",
]

export const DECISION_STATUS_LABELS: Record<DecisionStatus, string> = {
  proposed: "Proposed",
  discussing: "Discussing",
  accepted: "Accepted",
  rejected: "Rejected",
  superseded: "Superseded",
}

export const DECISION_LINK_TYPES: DecisionLinkType[] = [
  "task",
  "design_document",
  "lore_entry",
  "initiative",
]

export const DECISION_LINK_TYPE_LABELS: Record<DecisionLinkType, string> = {
  task: "Task",
  design_document: "Design doc",
  lore_entry: "Lore entry",
  initiative: "Initiative",
}
