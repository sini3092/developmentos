import { isTaskComplete, isTaskInProgress } from "@/lib/utils/roadmap"

export function isBlockedListName(name: string) {
  return /\bblocked\b/i.test(name)
}

export function isTaskOpen(task: { progress?: number | null; status?: string | null }) {
  if (task.status === "cancelled") {
    return false
  }
  return !isTaskComplete(task.progress)
}

export function isTaskBlocked(
  task: { status?: string | null; list_id?: string | null },
  blockedListIds: ReadonlySet<string>
) {
  if (task.status === "blocked") {
    return true
  }
  return Boolean(task.list_id && blockedListIds.has(task.list_id))
}

export function isTaskStarted(task: { progress?: number | null }) {
  return isTaskInProgress(task.progress)
}
