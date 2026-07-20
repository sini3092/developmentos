const EVENT_LABELS: Record<string, string> = {
  "task.created": "Task created",
  "task.updated": "Task updated",
  "task.status_changed": "Status changed",
  "task.assigned": "Task assigned",
  "task.comment": "Comment added",
  "task.pr_linked": "PR linked",
  "task.branch_linked": "Branch linked",
  "github.push": "Git push",
  "github.commit": "Commit",
  "github.pull_request": "Pull request",
  "initiative.update": "Roadmap update",
  "milestone.update": "Milestone update",
}

export function formatActivityEventType(eventType: string) {
  return EVENT_LABELS[eventType] ?? eventType.replaceAll(".", " · ")
}

export function formatActivityEventMessage(
  eventType: string,
  message: string | null,
  newValue: unknown
) {
  if (message) {
    return message
  }

  if (eventType === "github.push" && newValue && typeof newValue === "object") {
    const value = newValue as { branch_name?: string; commit_count?: number }
    if (value.branch_name && value.commit_count) {
      return `Pushed ${value.commit_count} commit${value.commit_count === 1 ? "" : "s"} to ${value.branch_name}`
    }
  }

  return "Project activity recorded."
}
