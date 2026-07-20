const GITHUB_API = "https://api.github.com"

export type GithubOAuthTokenResponse = {
  access_token: string
  scope: string
  token_type: string
}

export type GithubUserResponse = {
  id: number
  login: string
}

export type GithubPullRequestResponse = {
  number: number
  title: string
  html_url: string
  state: "open" | "closed"
  merged_at: string | null
}

export function getGithubOAuthConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID
  const clientSecret = process.env.GITHUB_CLIENT_SECRET
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

  return {
    clientId,
    clientSecret,
    siteUrl,
    isConfigured: Boolean(clientId && clientSecret),
    redirectUri: `${siteUrl}/api/integrations/github/callback`,
  }
}

export function buildGithubAuthorizeUrl(state: string) {
  const { clientId, redirectUri, isConfigured } = getGithubOAuthConfig()
  if (!isConfigured || !clientId) {
    throw new Error("GitHub OAuth is not configured.")
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user repo",
    state,
  })

  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

export async function exchangeGithubCode(code: string) {
  const { clientId, clientSecret, redirectUri } = getGithubOAuthConfig()
  if (!clientId || !clientSecret) {
    throw new Error("GitHub OAuth is not configured.")
  }

  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    throw new Error("Failed to exchange GitHub authorization code.")
  }

  const data = (await response.json()) as GithubOAuthTokenResponse & { error?: string }
  if (!data.access_token) {
    throw new Error(data.error ?? "GitHub did not return an access token.")
  }

  return data
}

export async function getGithubUser(accessToken: string) {
  const response = await fetch(`${GITHUB_API}/user`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })

  if (!response.ok) {
    throw new Error("Failed to load GitHub user profile.")
  }

  return (await response.json()) as GithubUserResponse
}

export async function getGithubPullRequest(
  accessToken: string,
  owner: string,
  repo: string,
  number: number
) {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/pulls/${number}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as GithubPullRequestResponse
}

export function resolveGithubPullRequestState(
  pr: Pick<GithubPullRequestResponse, "state" | "merged_at">
) {
  if (pr.merged_at) {
    return "merged" as const
  }

  return pr.state
}
