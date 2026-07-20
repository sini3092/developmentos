export type GithubRepoRef = {
  url: string
  owner: string
  name: string
}

export function parseGithubRepoUrl(input: string): GithubRepoRef | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const shorthand = trimmed.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/)
  if (shorthand) {
    const owner = shorthand[1]
    const name = shorthand[2].replace(/\.git$/, "")
    return {
      owner,
      name,
      url: `https://github.com/${owner}/${name}`,
    }
  }

  const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`
  let parsed: URL

  try {
    parsed = new URL(withProtocol)
  } catch {
    return null
  }

  if (parsed.hostname !== "github.com") {
    return null
  }

  const segments = parsed.pathname.replace(/\/$/, "").split("/").filter(Boolean)
  if (segments.length < 2) {
    return null
  }

  const owner = segments[0]
  const name = segments[1].replace(/\.git$/, "")

  if (!/^[a-zA-Z0-9_.-]+$/.test(owner) || !/^[a-zA-Z0-9_.-]+$/.test(name)) {
    return null
  }

  return {
    owner,
    name,
    url: `https://github.com/${owner}/${name}`,
  }
}

export function formatGithubRepoLabel(repo: Pick<GithubRepoRef, "owner" | "name">) {
  return `${repo.owner}/${repo.name}`
}

export type GithubPullRequestRef = {
  url: string
  owner: string
  repo: string
  number: number
}

export function parseGithubPullRequestUrl(input: string): GithubPullRequestRef | null {
  const trimmed = input.trim()
  if (!trimmed) {
    return null
  }

  const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`
  let parsed: URL

  try {
    parsed = new URL(withProtocol)
  } catch {
    return null
  }

  if (parsed.hostname !== "github.com") {
    return null
  }

  const segments = parsed.pathname.replace(/\/$/, "").split("/").filter(Boolean)
  if (segments.length < 4 || segments[2] !== "pull") {
    return null
  }

  const owner = segments[0]
  const repo = segments[1].replace(/\.git$/, "")
  const number = Number(segments[3])

  if (
    !/^[a-zA-Z0-9_.-]+$/.test(owner) ||
    !/^[a-zA-Z0-9_.-]+$/.test(repo) ||
    !Number.isInteger(number) ||
    number <= 0
  ) {
    return null
  }

  return {
    owner,
    repo,
    number,
    url: `https://github.com/${owner}/${repo}/pull/${number}`,
  }
}

export function formatGithubPullRequestLabel(
  pr: Pick<GithubPullRequestRef, "owner" | "repo" | "number">
) {
  return `${pr.owner}/${pr.repo}#${pr.number}`
}

export function formatGithubBranchLabel(branchName: string) {
  return branchName
}

export function normalizeBranchName(input: string) {
  const trimmed = input.trim().replace(/^refs\/heads\//, "")
  if (!trimmed || trimmed.length > 255) {
    return null
  }
  if (!/^[a-zA-Z0-9._\/-]+$/.test(trimmed)) {
    return null
  }
  return trimmed
}

export function buildGithubBranchUrl(owner: string, repo: string, branchName: string) {
  return `https://github.com/${owner}/${repo}/tree/${encodeURIComponent(branchName)}`
}
