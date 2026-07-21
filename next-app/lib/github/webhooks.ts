import { createHmac, timingSafeEqual } from "node:crypto"

export type GithubPushPayload = {
  ref: string
  before?: string
  after?: string
  compare?: string
  repository: {
    full_name: string
    html_url: string
  }
  pusher: {
    name: string
  }
  commits: Array<{
    id: string
    message: string
    url: string
    author: {
      name: string
      username?: string
    }
  }>
}

export type GithubPullRequestPayload = {
  action: string
  number: number
  pull_request: {
    number: number
    title: string
    html_url: string
    state: "open" | "closed"
    merged: boolean
    head: {
      ref: string
    }
  }
  repository: {
    full_name: string
  }
}

export function verifyGithubWebhookSignature(
  payload: string,
  signatureHeader: string | null,
  secret: string
) {
  if (!signatureHeader?.startsWith("sha256=")) {
    return false
  }

  const expected = createHmac("sha256", secret).update(payload).digest("hex")
  const received = signatureHeader.slice("sha256=".length)

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(received))
  } catch {
    return false
  }
}

export function parseGithubRepositoryFullName(fullName: string) {
  const [owner, name] = fullName.split("/")
  if (!owner || !name) {
    return null
  }
  return { owner, name }
}

export function extractBranchName(ref: string) {
  const prefix = "refs/heads/"
  if (!ref.startsWith(prefix)) {
    return null
  }
  return ref.slice(prefix.length)
}

export function resolvePullRequestState(pr: GithubPullRequestPayload["pull_request"]) {
  if (pr.merged) {
    return "merged" as const
  }
  return pr.state
}
