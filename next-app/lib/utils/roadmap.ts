import type { InitiativeHealth } from "@/lib/database.types"
import type { InitiativeWithOwner } from "@/lib/database.types"

export type InitiativeTaskBreakdown = {
  done: number
  in_progress: number
  in_review: number
  blocked: number
  ready: number
  backlog: number
}

export type RoadmapListBucket = {
  list_id: string | null
  list_name: string
  color: string
  count: number
}

export type InitiativeTaskPreview = {
  id: string
  identifier: string
  title: string
  status: string
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

export function isTaskComplete(progress: number | null | undefined) {
  return (progress ?? 0) >= 100
}

export function isTaskInProgress(progress: number | null | undefined) {
  const value = progress ?? 0
  return value > 0 && value < 100
}

export function remainingPercent(progress: number | null | undefined) {
  return Math.max(0, Math.min(100, 100 - (progress ?? 0)))
}

/** Progress-based breakdown mapped onto legacy keys for existing UI components. */
export function buildTaskBreakdown(
  tasks: Array<{ progress?: number | null }>
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
    const progress = task.progress ?? 0
    if (isTaskComplete(progress)) {
      breakdown.done += 1
    } else if (isTaskInProgress(progress)) {
      breakdown.in_progress += 1
    } else {
      breakdown.backlog += 1
    }
  }

  return breakdown
}

export function buildListBreakdown(
  tasks: Array<{ list_id: string | null }>,
  lists: Array<{ id: string; name: string; color: string }>
): RoadmapListBucket[] {
  const counts = new Map<string | null, number>()

  for (const task of tasks) {
    counts.set(task.list_id, (counts.get(task.list_id) ?? 0) + 1)
  }

  const buckets: RoadmapListBucket[] = lists.map((list) => ({
    list_id: list.id,
    list_name: list.name,
    color: list.color,
    count: counts.get(list.id) ?? 0,
  }))

  const unlisted = counts.get(null) ?? 0
  if (unlisted > 0) {
    buckets.push({
      list_id: null,
      list_name: "No list",
      color: "slate",
      count: unlisted,
    })
  }

  return buckets.filter((bucket) => bucket.count > 0)
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

export function deriveDisplayHealth(
  health: InitiativeHealth,
  breakdown: InitiativeTaskBreakdown | undefined,
  taskCount: number
): InitiativeHealth {
  if (taskCount === 0) {
    return "no_status"
  }

  if (health !== "no_status") {
    return health
  }

  if (breakdown?.done === taskCount) {
    return "on_track"
  }

  if ((breakdown?.in_progress ?? 0) > 0) {
    return "on_track"
  }

  return "no_status"
}
