import type {
  InitiativeHealth,
  InitiativePriority,
  InitiativeStatus,
  MilestoneStatus,
  PlanningHorizon,
} from "@/lib/database.types"

export const PLANNING_HORIZONS: PlanningHorizon[] = ["now", "next", "later"]

export const PLANNING_HORIZON_LABELS: Record<PlanningHorizon, string> = {
  now: "Now",
  next: "Next",
  later: "Later",
}

export const INITIATIVE_STATUSES: InitiativeStatus[] = [
  "idea",
  "planned",
  "active",
  "paused",
  "completed",
  "cancelled",
]

export const INITIATIVE_STATUS_LABELS: Record<InitiativeStatus, string> = {
  idea: "Idea",
  planned: "Planned",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
}

export const INITIATIVE_HEALTH_OPTIONS: InitiativeHealth[] = [
  "on_track",
  "at_risk",
  "off_track",
  "no_status",
]

export const INITIATIVE_HEALTH_LABELS: Record<InitiativeHealth, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  off_track: "Off Track",
  no_status: "No Status",
}

export const INITIATIVE_HEALTH_TONES: Record<
  InitiativeHealth,
  "success" | "warning" | "danger" | "default"
> = {
  on_track: "success",
  at_risk: "warning",
  off_track: "danger",
  no_status: "default",
}

export const INITIATIVE_PRIORITIES: InitiativePriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
]

export const INITIATIVE_PRIORITY_LABELS: Record<InitiativePriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "No Priority",
}

export const MILESTONE_STATUSES: MilestoneStatus[] = [
  "draft",
  "planned",
  "active",
  "completed",
  "missed",
  "cancelled",
]

export const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  draft: "Draft",
  planned: "Planned",
  active: "Active",
  completed: "Completed",
  missed: "Missed",
  cancelled: "Cancelled",
}
