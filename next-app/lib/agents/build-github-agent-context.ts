import { getGithubAccessToken } from "@/lib/auth/integrations-context"
import { createClient } from "@/lib/supabase/server"

const GITHUB_API = "https://api.github.com"

function githubHeaders(token: string) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2022-11-28",
  }
}

async function githubGet<T>(token: string, path: string): Promise<T | null> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    headers: githubHeaders(token),
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    return null
  }

  return (await response.json()) as T
}

export async function buildGithubAgentContext(projectId: string) {
  const supabase = await createClient()
  const { data: project } = await supabase
    .from("projects")
    .select("github_owner, github_repo_name, github_repo_url")
    .eq("id", projectId)
    .maybeSingle()

  if (!project?.github_owner || !project.github_repo_name) {
    return ""
  }

  const token = await getGithubAccessToken()
  if (!token) {
    return [
      "## GitHub (linked, no token)",
      `Repo: ${project.github_owner}/${project.github_repo_name}`,
      "Connect GitHub in Settings to let Souls read commits and suggest file edits.",
    ].join("\n")
  }

  const owner = project.github_owner
  const repo = project.github_repo_name

  const repoMeta = await githubGet<{ default_branch?: string; description?: string | null }>(
    token,
    `/repos/${owner}/${repo}`
  )

  const branch = repoMeta?.default_branch ?? "main"

  const ref = await githubGet<{ object?: { sha?: string } }>(
    token,
    `/repos/${owner}/${repo}/git/ref/heads/${branch}`
  )
  const treeSha = ref?.object?.sha

  const [commits, tree] = await Promise.all([
    githubGet<Array<{ sha: string; commit: { message: string } }>>(
      token,
      `/repos/${owner}/${repo}/commits?per_page=5`
    ),
    treeSha
      ? githubGet<{ tree: Array<{ path: string; type: string }> }>(
          token,
          `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`
        )
      : Promise.resolve(null),
  ])

  const recentCommits =
    commits
      ?.map((commit) => `- ${commit.commit.message.split("\n")[0]?.slice(0, 100)}`)
      .join("\n") ?? "None"

  const interestingPaths =
    tree?.tree
      ?.filter((entry) => entry.type === "blob")
      .map((entry) => entry.path)
      .filter(
        (path) =>
          /\.(gd|tscn|tres|cs|md|json|toml|cfg|txt)$/i.test(path) ||
          path === "README.md" ||
          path.endsWith("project.godot")
      )
      .slice(0, 40) ?? []

  let readmeSnippet = ""
  const readme = await githubGet<{ content?: string; encoding?: string }>(
    token,
    `/repos/${owner}/${repo}/contents/README.md?ref=${branch}`
  )
  if (readme?.content && readme.encoding === "base64") {
    readmeSnippet = Buffer.from(readme.content, "base64").toString("utf8").slice(0, 1200).trim()
  }

  return [
    "## GitHub (read-only for Souls)",
    `Repo: ${owner}/${repo} (${project.github_repo_url ?? "linked"})`,
    repoMeta?.description ? `Description: ${repoMeta.description}` : "",
    "",
    "### Recent commits",
    recentCommits,
    "",
    "### Notable paths",
    interestingPaths.length > 0
      ? interestingPaths.map((path) => `- ${path}`).join("\n")
      : "None listed",
    readmeSnippet ? `\n### README excerpt\n\`\`\`\n${readmeSnippet}\n\`\`\`` : "",
    "",
    "Souls can apply small fixes on GitHub (branch + auto PR). Allowed: text/source files only (.md, .gd, .json, .tscn, etc.) — not binaries, .env, or secrets. Max 2 files. Local Godot folder: ask @personal.",
  ]
    .filter(Boolean)
    .join("\n")
}
