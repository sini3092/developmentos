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

export function getActivityEventUrl(eventType: string, newValue: unknown) {
  if (!newValue || typeof newValue !== "object") {
    return null
  }

  const value = newValue as {
    latest_commit?: { url?: string }
    compare_url?: string | null
    pr_url?: string
    repository_url?: string
    branch_name?: string
  }

  if (eventType === "github.pull_request" && value.pr_url) {
    return value.pr_url
  }

  if (eventType === "github.push" || eventType === "github.commit") {
    if (value.latest_commit?.url) {
      return value.latest_commit.url
    }
    if (value.compare_url) {
      return value.compare_url
    }
    if (value.repository_url && value.branch_name) {
      return `${value.repository_url}/commits/${value.branch_name}`
    }
  }

  return null
}
