export type GithubCommitSummary = {
  id: string
  message: string
  url?: string
  author?: string
}

export type GithubActivityValue = {
  branch_name?: string
  commit_count?: number
  pusher?: string
  latest_commit?: GithubCommitSummary | null
  commits?: GithubCommitSummary[]
  compare_url?: string | null
  repository_url?: string
  action?: string
  pr_number?: number
  pr_title?: string
  pr_state?: string
  pr_url?: string
}

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

export function parseGithubActivityValue(newValue: unknown): GithubActivityValue | null {
  if (!newValue || typeof newValue !== "object") {
    return null
  }

  return newValue as GithubActivityValue
}

export function isGithubActivityEvent(eventType: string) {
  return eventType.startsWith("github.")
}

export function getGithubCommits(value: GithubActivityValue | null) {
  if (!value) {
    return []
  }

  if (value.commits?.length) {
    return value.commits
  }

  if (value.latest_commit) {
    return [value.latest_commit]
  }

  return []
}

export function formatCommitSha(commitId: string) {
  return commitId.slice(0, 7)
}

export function getActivityEventUrl(eventType: string, newValue: unknown) {
  const value = parseGithubActivityValue(newValue)
  if (!value) {
    return null
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
