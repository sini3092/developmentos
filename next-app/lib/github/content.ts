const GITHUB_API = "https://api.github.com"

function encodeGithubPath(path: string) {
  return path
    .replace(/\\/g, "/")
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")
}

export function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

export type GithubRepoRef = {
  owner: string
  repo: string
  defaultBranch: string
}

export async function getGithubRepoRef(
  token: string,
  owner: string,
  repo: string
): Promise<GithubRepoRef | null> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: githubHeaders(token),
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as { default_branch?: string }
  return {
    owner,
    repo,
    defaultBranch: data.default_branch ?? "main",
  }
}

export async function getGithubFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  ref: string
) {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeGithubPath(path)}?ref=${encodeURIComponent(ref)}`,
    { headers: githubHeaders(token), next: { revalidate: 0 } }
  )

  if (response.status === 404) {
    return { content: "", sha: null as string | null }
  }

  if (!response.ok) {
    throw new Error(`Could not read ${path} (${response.status}).`)
  }

  const data = (await response.json()) as {
    content?: string
    encoding?: string
    sha?: string
  }

  if (!data.content || data.encoding !== "base64") {
    throw new Error(`Could not decode ${path}.`)
  }

  return {
    content: Buffer.from(data.content, "base64").toString("utf8"),
    sha: data.sha ?? null,
  }
}

export async function putGithubFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  branch: string,
  message: string,
  content: string,
  sha: string | null
) {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/${encodeGithubPath(path)}`,
    {
      method: "PUT",
      headers: {
        ...githubHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch,
        ...(sha ? { sha } : {}),
      }),
    }
  )

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Could not update ${path}: ${text.slice(0, 200)}`)
  }

  const data = (await response.json()) as {
    commit?: { html_url?: string; sha?: string }
    content?: { html_url?: string }
  }

  return {
    commitUrl: data.commit?.html_url ?? null,
    fileUrl: data.content?.html_url ?? null,
    commitSha: data.commit?.sha ?? null,
  }
}

export async function createGithubBranch(
  token: string,
  owner: string,
  repo: string,
  branchName: string,
  fromSha: string
) {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ref: `refs/heads/${branchName}`,
      sha: fromSha,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Could not create branch ${branchName}: ${text.slice(0, 200)}`)
  }
}

export async function getGithubBranchHeadSha(
  token: string,
  owner: string,
  repo: string,
  branch: string
) {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(branch)}`,
    { headers: githubHeaders(token), next: { revalidate: 0 } }
  )

  if (!response.ok) {
    return null
  }

  const data = (await response.json()) as { object?: { sha?: string } }
  return data.object?.sha ?? null
}

export async function createGithubPullRequest(
  token: string,
  owner: string,
  repo: string,
  {
    title,
    body,
    head,
    base,
  }: {
    title: string
    body: string
    head: string
    base: string
  }
) {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      body,
      head,
      base,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Could not open pull request: ${text.slice(0, 200)}`)
  }

  const data = (await response.json()) as {
    html_url?: string
    number?: number
  }

  return {
    url: data.html_url ?? null,
    number: data.number ?? null,
  }
}
