import type { InitiativeHealth, PlanningHorizon, TaskStatus } from "@/lib/database.types"
import type { InitiativeWithOwner } from "@/lib/database.types"

export type InitiativeTaskBreakdown = {
  done: number
  in_progress: number
  in_review: number
  blocked: number
  ready: number
  backlog: number
}

export type InitiativeTaskPreview = {
  id: string
  identifier: string
  title: string
  status: TaskStatus
  progress: number
}

export type RoadmapBoardStats = {
  totalTasks: number
  doneTasks: number
  openTasks: number
  blockedTasks: number
  averageProgress: number
  unlinkedTasks: number
  initiativesWithWork: number
}

const HORIZON_ACCENTS: Record<PlanningHorizon, string> = {
  now: "border-l-info bg-info/5",
  next: "border-l-warning bg-warning/5",
  later: "border-l-muted-foreground/40 bg-muted/20",
}

const HORIZON_HEADER: Record<PlanningHorizon, string> = {
  now: "text-info",
  next: "text-warning",
  later: "text-muted-foreground",
}

export function getHorizonAccent(horizon: PlanningHorizon) {
  return HORIZON_ACCENTS[horizon]
}

export function getHorizonHeaderClass(horizon: PlanningHorizon) {
  return HORIZON_HEADER[horizon]
}

export function buildTaskBreakdown(
  tasks: Array<{ status: TaskStatus }>
): InitiativeTaskBreakdown {
  const breakdown: InitiativeTaskBreakdown = {
    done: 0,
    in_progress: 0,
    in_review: 0,
    blocked: 0,
    ready: 0,
    backlog: 0,
  }

  for (const task of tasks) {
    if (task.status in breakdown) {
      breakdown[task.status as keyof InitiativeTaskBreakdown] += 1
    }
  }

  return breakdown
}

export function computeBoardStats(
  initiatives: InitiativeWithOwner[],
  unlinkedTasks: number
): RoadmapBoardStats {
  const totalTasks = initiatives.reduce((sum, initiative) => sum + initiative.task_count, 0)
  const doneTasks = initiatives.reduce(
    (sum, initiative) => sum + (initiative.task_done_count ?? 0),
    0
  )
  const blockedTasks = initiatives.reduce(
    (sum, initiative) => sum + (initiative.task_blocked_count ?? 0),
    0
  )
  const initiativesWithWork = initiatives.filter((initiative) => initiative.task_count > 0).length
  const progressValues = initiatives
    .filter((initiative) => initiative.task_count > 0)
    .map((initiative) => initiative.progress)

  const averageProgress =
    progressValues.length > 0
      ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length)
      : 0

  return {
    totalTasks,
    doneTasks,
    openTasks: totalTasks - doneTasks,
    blockedTasks,
    averageProgress,
    unlinkedTasks,
    initiativesWithWork,
  }
}

export function computeColumnProgress(initiatives: InitiativeWithOwner[]) {
  const withTasks = initiatives.filter((initiative) => initiative.task_count > 0)
  if (withTasks.length === 0) {
    return 0
  }

  return Math.round(
    withTasks.reduce((sum, initiative) => sum + initiative.progress, 0) / withTasks.length
  )
}

export function deriveDisplayHealth(
  health: InitiativeHealth,
  breakdown: InitiativeTaskBreakdown | undefined,
  taskCount: number
): InitiativeHealth {
  if (taskCount === 0) {
    return "no_status"
  }

  if (breakdown?.blocked && breakdown.blocked > 0) {
    return health === "off_track" ? "off_track" : "at_risk"
  }

  if (health !== "no_status") {
    return health
  }

  if (breakdown?.done === taskCount) {
    return "on_track"
  }

  if ((breakdown?.in_progress ?? 0) > 0 || (breakdown?.in_review ?? 0) > 0) {
    return "on_track"
  }

  return "no_status"
}
