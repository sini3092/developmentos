import { z } from "zod"

import {
  createGithubBranch,
  createGithubPullRequest,
  getGithubBranchHeadSha,
  getGithubFileContent,
  getGithubRepoRef,
  putGithubFileContent,
} from "@/lib/github/content"
import { fetchGithubCompareDiff } from "@/lib/github/diff"
import { getGithubAccessToken } from "@/lib/auth/integrations-context"
import { chatWithOpenRouter } from "@/lib/openrouter/chat"
import { createClient } from "@/lib/supabase/server"
import { buildUnifiedDiff } from "@/lib/utils/text-diff"

const MAX_FILE_CHARS = 80_000
const MAX_FILES = 3

const ALLOWED_EXTENSIONS = [
  ".md",
  ".txt",
  ".json",
  ".yml",
  ".yaml",
  ".toml",
  ".gd",
  ".cs",
  ".cfg",
  ".ini",
  ".xml",
  ".html",
  ".css",
  ".js",
  ".ts",
  ".tsx",
  ".jsx",
  ".mjs",
  ".cjs",
  ".shader",
  ".gdshader",
  ".tres",
  ".tscn",
  ".translation",
  ".gdextension",
  ".csproj",
  ".props",
  ".sln",
]

const fixPlanSchema = z.object({
  can_fix: z.boolean(),
  reason_if_not: z.string().optional(),
  branch_name: z.string().optional(),
  pr_title: z.string().optional(),
  pr_body: z.string().optional(),
  summary: z.string().optional(),
  fixes: z
    .array(
      z.object({
        path: z.string().min(1),
        content: z.string(),
        commit_message: z.string().min(1).max(200),
      })
    )
    .max(MAX_FILES)
    .optional(),
})

const pathPickSchema = z.object({
  paths: z.array(z.string()).max(MAX_FILES),
})

function parseJsonResponse(text: string) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(raw) as unknown
}

export function isSoulsFixRequest(prompt: string) {
  const normalized = prompt.toLowerCase()
  return (
    /\b(fiks|fix|fikse|rett|rette|bug|bugfix|patch|endre|change|update|typo|skrivefeil|juster|korriger|oppdater)\b/i.test(
      normalized
    ) ||
    /\b(lag|gjør|gjor|apply|implementer|implement|skriv|legg)\b/i.test(normalized)
  )
}

function isAllowedPath(path: string) {
  const normalized = path.replace(/\\/g, "/").trim()
  if (!normalized || normalized.startsWith("/") || normalized.includes("..")) {
    return false
  }
  if (/\.(env|pem|key|p12|pfx|import|uid|png|jpg|jpeg|gif|webp|wav|ogg|mp3|ttf|otf|woff2?)$/i.test(normalized)) {
    return false
  }
  if (/(^|\/)\.env/i.test(normalized)) {
    return false
  }
  if (/(secret|credential|password|token)/i.test(normalized)) {
    return false
  }
  if (normalized === "project.godot" || normalized.endsWith("/project.godot")) {
    return true
  }
  const lower = normalized.toLowerCase()
  return ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext))
}

function extractPathHints(prompt: string, githubContext: string) {
  const paths = new Set<string>()

  const inlinePaths =
    prompt.match(/(?:[\w.-]+\/)+[\w.-]+(?:\.\w{1,12})?|\bproject\.godot\b|\b[\w.-]+\.\w{1,12}\b/g) ?? []
  for (const path of inlinePaths) {
    if (isAllowedPath(path)) {
      paths.add(path.replace(/\\/g, "/"))
    }
  }

  const contextPaths = githubContext.match(/^- (.+)$/gm) ?? []
  for (const line of contextPaths) {
    const path = line.replace(/^- /, "").trim()
    if (!isAllowedPath(path)) {
      continue
    }
    const basename = path.split("/").pop()?.toLowerCase() ?? ""
    if (basename && prompt.toLowerCase().includes(basename)) {
      paths.add(path)
    }
  }

  if (paths.size === 0) {
    for (const fallback of ["README.md", "project.godot"]) {
      if (isAllowedPath(fallback)) {
        paths.add(fallback)
      }
    }
  }

  return [...paths]
}

async function createUniqueBranch(
  token: string,
  owner: string,
  repo: string,
  preferredName: string,
  fromSha: string
) {
  let branchName = preferredName
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await createGithubBranch(token, owner, repo, branchName, fromSha)
      return branchName
    } catch {
      branchName = `${preferredName}-${Date.now().toString(36).slice(-4)}`
    }
  }
  throw new Error("Could not create a fix branch on GitHub.")
}

async function getProjectGithub(projectId: string) {
  const supabase = await createClient()
  const { data: project } = await supabase
    .from("projects")
    .select("github_owner, github_repo_name, github_repo_url")
    .eq("id", projectId)
    .maybeSingle()

  if (!project?.github_owner || !project.github_repo_name) {
    return null
  }

  const token = await getGithubAccessToken()
  if (!token) {
    return null
  }

  const repoRef = await getGithubRepoRef(token, project.github_owner, project.github_repo_name)
  if (!repoRef) {
    return null
  }

  return {
    token,
    owner: project.github_owner,
    repo: project.github_repo_name,
    repoUrl: project.github_repo_url,
    ...repoRef,
  }
}

async function pickPathsWithLlm(input: {
  apiKey: string
  model: string
  userPrompt: string
  githubContext: string
  candidates: string[]
}) {
  if (input.candidates.length === 0) {
    return []
  }

  const raw = await chatWithOpenRouter({
    apiKey: input.apiKey,
    model: input.model,
    messages: [
      {
        role: "system",
        content:
          'Return ONLY JSON: { "paths": string[] }. Pick up to 3 repo paths to edit for the user request. Use exact paths from the candidate list.',
      },
      {
        role: "user",
        content: [
          input.githubContext,
          "",
          "Candidates:",
          input.candidates.map((path) => `- ${path}`).join("\n"),
          "",
          "Request:",
          input.userPrompt,
        ].join("\n"),
      },
    ],
    maxTokens: 300,
    temperature: 0,
  })

  try {
    const parsed = pathPickSchema.parse(parseJsonResponse(raw))
    return parsed.paths.filter((path) => input.candidates.includes(path)).slice(0, MAX_FILES)
  } catch {
    return input.candidates.slice(0, MAX_FILES)
  }
}

export type SoulsGithubFixResult =
  | {
      kind: "applied"
      summary: string
      prTitle: string
      pullRequestUrl: string | null
      pullRequestNumber: number | null
      branchName: string
      branchUrl: string
      baseBranch: string
      repoLabel: string
      files: Array<{
        path: string
        additions: number
        deletions: number
        patch: string | null
        commitUrl: string | null
      }>
    }
  | {
      kind: "declined"
      message: string
    }
  | null

export async function attemptSoulsGithubFix(input: {
  apiKey: string
  model: string
  projectId: string
  userPrompt: string
  githubContext: string
  transcript: string
}): Promise<SoulsGithubFixResult> {
  if (!isSoulsFixRequest(input.userPrompt)) {
    return null
  }

  const github = await getProjectGithub(input.projectId)
  if (!github) {
    return null
  }

  const candidatePaths = extractPathHints(input.userPrompt, input.githubContext)
  const contextPaths =
    input.githubContext.match(/^- (.+)$/gm)?.map((line) => line.replace(/^- /, "").trim()) ?? []
  const allowedCandidates = [...new Set([...candidatePaths, ...contextPaths])].filter(isAllowedPath)

  const pickedPaths =
    candidatePaths.length > 0
      ? candidatePaths.slice(0, MAX_FILES)
      : await pickPathsWithLlm({
          apiKey: input.apiKey,
          model: input.model,
          userPrompt: input.userPrompt,
          githubContext: input.githubContext,
          candidates: allowedCandidates.slice(0, 30),
        })

  const fileSnapshots: Array<{ path: string; content: string }> = []

  for (const path of pickedPaths) {
    try {
      const file = await getGithubFileContent(
        github.token,
        github.owner,
        github.repo,
        path,
        github.defaultBranch
      )
      if (file.content.length <= MAX_FILE_CHARS) {
        fileSnapshots.push({ path, content: file.content })
      }
    } catch {
      // Try next path.
    }
  }

  if (fileSnapshots.length === 0) {
    return {
      kind: "declined",
      message:
        "Fant ingen redigerbare filer på GitHub for denne forespørselen. Nevn filsti (f.eks. `README.md`) eller bruk @personal for lokale Godot-endringer.",
    }
  }

  const planRaw = await chatWithOpenRouter({
    apiKey: input.apiKey,
    model: input.model,
    messages: [
      {
        role: "system",
        content:
          "You are Souls, preparing a SMALL GitHub fix for a medieval fantasy survival game repo. " +
          "Return ONLY valid JSON (no markdown) with this shape:\n" +
          '{ "can_fix": boolean, "reason_if_not": string, "branch_name": string, "pr_title": string, "pr_body": string, "summary": string, "fixes": [{ "path": string, "content": string, "commit_message": string }] }\n' +
          "Rules:\n" +
          `- Only fix what the user asked. Max ${MAX_FILES} files from the provided snapshots.\n` +
          "- `content` must be the FULL new file content, not a diff.\n" +
          "- Make minimal, correct edits only.\n" +
          "- branch_name like souls/fix-short-description (lowercase, hyphens).\n" +
          "- pr_title short; pr_body explains the change for reviewers.\n" +
          "- summary is a short user-facing message in the user's language.\n" +
          "- If unsure or change is too large/risky, set can_fix false.",
      },
      {
        role: "user",
        content: [
          input.githubContext,
          "",
          "## Current file contents (default branch)",
          ...fileSnapshots.map(
            (file) => `### ${file.path}\n\`\`\`\n${file.content}\n\`\`\``
          ),
          "",
          "## Channel context",
          input.transcript,
          "",
          "## Request",
          input.userPrompt,
        ].join("\n"),
      },
    ],
    maxTokens: 8000,
    temperature: 0.2,
  })

  let plan: z.infer<typeof fixPlanSchema>
  try {
    plan = fixPlanSchema.parse(parseJsonResponse(planRaw))
  } catch {
    return {
      kind: "declined",
      message:
        "Klarte ikke å lage en trygg fix-plan. Nevn filen eksplisitt, eller be @personal om lokale endringer.",
    }
  }

  if (!plan.can_fix || !plan.fixes?.length) {
    return {
      kind: "declined",
      message:
        plan.reason_if_not?.trim() ||
        plan.summary?.trim() ||
        "Dette var for uklart eller risikabelt for auto-fiks på GitHub. Prøv @personal for lokale endringer.",
    }
  }

  const branchName = (plan.branch_name ?? `souls/fix-${Date.now()}`)
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .replace(/^\/+/, "")
    .slice(0, 60)

  const headSha = await getGithubBranchHeadSha(
    github.token,
    github.owner,
    github.repo,
    github.defaultBranch
  )
  if (!headSha) {
    return {
      kind: "declined",
      message: "Kunne ikke lese default branch på GitHub.",
    }
  }

  const createdBranch = await createUniqueBranch(
    github.token,
    github.owner,
    github.repo,
    branchName,
    headSha
  )

  const beforeByPath = new Map(fileSnapshots.map((file) => [file.path, file.content]))
  const applied: Array<{
    path: string
    commitUrl: string | null
    additions: number
    deletions: number
    patch: string | null
  }> = []

  for (const fix of plan.fixes) {
    const path = fix.path.replace(/\\/g, "/").trim()
    if (!isAllowedPath(path)) {
      return {
        kind: "declined",
        message: `Blokkerte \`${path}\` — filtypen er ikke tillatt for auto-fiks.`,
      }
    }
    if (fix.content.length > MAX_FILE_CHARS) {
      return {
        kind: "declined",
        message: `\`${path}\` er for stor for auto-fiks. Be @personal.`,
      }
    }

    const before = beforeByPath.get(path)
    if (before === undefined) {
      return {
        kind: "declined",
        message: `Fant ikke innhold for \`${path}\` på GitHub. Nevn en fil fra repoet.`,
      }
    }

    if (before === fix.content) {
      return {
        kind: "declined",
        message: `Ingen faktisk endring i \`${path}\`. Beskriv hva som skal endres.`,
      }
    }

    const existing = await getGithubFileContent(
      github.token,
      github.owner,
      github.repo,
      path,
      createdBranch
    )

    const result = await putGithubFileContent(
      github.token,
      github.owner,
      github.repo,
      path,
      createdBranch,
      fix.commit_message,
      fix.content,
      existing.sha
    )

    const localDiff = buildUnifiedDiff(before, fix.content, path)
    applied.push({
      path,
      commitUrl: result.commitUrl,
      additions: localDiff.additions,
      deletions: localDiff.deletions,
      patch: localDiff.patch,
    })
  }

  const branchHeadSha = await getGithubBranchHeadSha(
    github.token,
    github.owner,
    github.repo,
    createdBranch
  )

  if (branchHeadSha) {
    const compare = await fetchGithubCompareDiff(
      github.token,
      github.owner,
      github.repo,
      headSha,
      branchHeadSha
    )

    if (compare?.files?.length) {
      for (const file of applied) {
        const remote = compare.files.find((entry) => entry.filename === file.path)
        if (remote?.patch) {
          file.patch = remote.patch
          file.additions = remote.additions
          file.deletions = remote.deletions
        }
      }
    }
  }

  const fileList = applied.map((file) => `- \`${file.path}\``).join("\n")
  const prTitle =
    plan.pr_title?.trim() ||
    plan.summary?.trim()?.slice(0, 80) ||
    `Souls fix: ${applied.map((file) => file.path).join(", ")}`
  const prBody =
    plan.pr_body?.trim() ||
    [
      plan.summary?.trim() || "Small fix prepared by Souls in DevelopmentOS.",
      "",
      "Files:",
      fileList,
      "",
      "_Opened automatically from a channel request — review before merge._",
    ].join("\n")

  const pullRequest = await createGithubPullRequest(github.token, github.owner, github.repo, {
    title: prTitle,
    body: prBody,
    head: createdBranch,
    base: github.defaultBranch,
  })

  const branchUrl = `https://github.com/${github.owner}/${github.repo}/tree/${createdBranch}`
  const summary =
    plan.summary?.trim() || `Åpnet PR med ${applied.length} filendring${applied.length === 1 ? "" : "er"}.`

  return {
    kind: "applied",
    summary,
    prTitle,
    pullRequestUrl: pullRequest.url,
    pullRequestNumber: pullRequest.number,
    branchName: createdBranch,
    branchUrl,
    baseBranch: github.defaultBranch,
    repoLabel: `${github.owner}/${github.repo}`,
    files: applied,
  }
}
