const GITHUB_API = "https://api.github.com"

export type GithubDiffFile = {
  filename: string
  status: string
  additions: number
  deletions: number
  patch: string | null
}

export type GithubDiffResponse = {
  commits: Array<{
    sha: string
    message: string
    author: string | null
  }>
  files: GithubDiffFile[]
  total_commits: number
}

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

export async function fetchGithubCompareDiff(
  token: string,
  owner: string,
  repo: string,
  beforeSha: string,
  afterSha: string
): Promise<GithubDiffResponse | null> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/compare/${beforeSha}...${afterSha}`,
    { headers: githubHeaders(token), next: { revalidate: 0 } }
  )

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as {
    commits?: Array<{
      sha: string
      commit: { message: string; author: { name: string | null } }
    }>
    files?: Array<{
      filename: string
      status: string
      additions: number
      deletions: number
      patch?: string
    }>
  }

  return {
    commits:
      data.commits?.map((commit) => ({
        sha: commit.sha,
        message: commit.commit.message.split("\n")[0],
        author: commit.commit.author.name,
      })) ?? [],
    files:
      data.files?.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch ?? null,
      })) ?? [],
    total_commits: data.commits?.length ?? 0,
  }
}

export async function fetchGithubCommitDiff(
  token: string,
  owner: string,
  repo: string,
  sha: string
): Promise<GithubDiffResponse | null> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/commits/${sha}`, {
    headers: githubHeaders(token),
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as {
    sha: string
    commit: { message: string; author: { name: string | null } }
    files?: Array<{
      filename: string
      status: string
      additions: number
      deletions: number
      patch?: string
    }>
  }

  return {
    commits: [
      {
        sha: data.sha,
        message: data.commit.message.split("\n")[0],
        author: data.commit.author.name,
      },
    ],
    files:
      data.files?.map((file) => ({
        filename: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        patch: file.patch ?? null,
      })) ?? [],
    total_commits: 1,
  }
}
