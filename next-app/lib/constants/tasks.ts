import type { Discipline, TaskPriority, TaskStatus } from "@/lib/database.types"

export const TASK_STATUSES: TaskStatus[] = [
  "backlog",
  "ready",
  "in_progress",
  "in_review",
  "blocked",
  "done",
  "cancelled",
]

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: "Backlog",
  ready: "Ready",
  in_progress: "In Progress",
  in_review: "In Review",
  blocked: "Blocked",
  done: "Done",
  cancelled: "Cancelled",
}

export const TASK_STATUS_TONES: Record<
  TaskStatus,
  "default" | "info" | "success" | "warning" | "danger"
> = {
  backlog: "default",
  ready: "default",
  in_progress: "info",
  in_review: "warning",
  blocked: "danger",
  done: "success",
  cancelled: "default",
}

export const TASK_PRIORITIES: TaskPriority[] = [
  "urgent",
  "high",
  "medium",
  "low",
  "none",
]

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  urgent: "Urgent",
  high: "High",
  medium: "Medium",
  low: "Low",
  none: "No Priority",
}

export const TASK_PRIORITY_TONES: Record<
  TaskPriority,
  "default" | "danger" | "warning" | "info"
> = {
  urgent: "danger",
  high: "warning",
  medium: "info",
  low: "default",
  none: "default",
}

export const DISCIPLINES: Discipline[] = [
  "design",
  "programming",
  "3d_art",
  "2d_art",
  "animation",
  "audio",
  "narrative",
  "worldbuilding",
  "ui_ux",
  "testing",
  "production",
]

export const DISCIPLINE_LABELS: Record<Discipline, string> = {
  design: "Design",
  programming: "Programming",
  "3d_art": "3D Art",
  "2d_art": "2D Art",
  animation: "Animation",
  audio: "Audio",
  narrative: "Narrative",
  worldbuilding: "Worldbuilding",
  ui_ux: "UI/UX",
  testing: "Testing",
  production: "Production",
}

export const OPEN_TASK_STATUSES: TaskStatus[] = TASK_STATUSES.filter(
  (status) => status !== "done" && status !== "cancelled"
)

export const KANBAN_COLUMNS: TaskStatus[] = [
  "backlog",
  "ready",
  "in_progress",
  "in_review",
  "blocked",
  "done",
]

export const KANBAN_COLUMN_ACCENTS: Record<TaskStatus, string> = {
  backlog: "border-t-muted-foreground/40",
  ready: "border-t-muted-foreground/60",
  in_progress: "border-t-info",
  in_review: "border-t-warning",
  blocked: "border-t-danger",
  done: "border-t-success",
  cancelled: "border-t-muted-foreground/30",
}

export const LABEL_COLORS = [
  "slate",
  "blue",
  "emerald",
  "amber",
  "rose",
  "purple",
  "cyan",
  "orange",
] as const

export type LabelColor = (typeof LABEL_COLORS)[number]

export const LABEL_COLOR_CLASSES: Record<LabelColor, string> = {
  slate: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  blue: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  rose: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  purple: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  cyan: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  orange: "bg-orange-500/15 text-orange-300 border-orange-500/30",
}
