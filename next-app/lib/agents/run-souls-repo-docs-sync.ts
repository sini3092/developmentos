import { z } from "zod"

import { SOULS_REPO_DOCS_SYNC_SYSTEM_PROMPT } from "@/lib/agents/souls-repo-docs-sync-prompt"
import { commitTouchesDocFile } from "@/lib/github/doc-paths"
import {
  getGithubBranchHeadSha,
  getGithubCommitChangedFiles,
  getGithubFileContent,
  getGithubRepoRef,
  putGithubFileContent,
} from "@/lib/github/content"
import { getGithubTokenForProjectAdmin } from "@/lib/github/project-token"
import { buildLoreDocMarkdown } from "@/lib/lore/export-lore-doc"
import { chatWithOpenRouter } from "@/lib/openrouter/chat"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"

const docsPlanSchema = z.object({
  game_status_changed: z.boolean(),
  game_status_markdown: z.string().optional(),
  summary: z.string().min(1),
})

function parseJsonResponse(text: string) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(raw) as unknown
}

async function buildDocsGapContext(
  supabase: ReturnType<typeof createAdminClient>,
  projectId: string
) {
  const [{ data: lists }, { data: tasks }] = await Promise.all([
    supabase
      .from("board_lists")
      .select("id, name, board_key")
      .eq("project_id", projectId)
      .order("position"),
    supabase
      .from("tasks")
      .select("id, identifier, title, status, progress, list_id, description")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(200),
  ])

  const listById = new Map((lists ?? []).map((list) => [list.id, list]))

  const roadmapLists = (lists ?? []).filter((list) => list.board_key === "roadmap")
  const roadmapLines = roadmapLists.map((list) => {
    const listTasks = (tasks ?? []).filter((task) => task.list_id === list.id)
    const preview = listTasks
      .slice(0, 8)
      .map((task) => `  - ${task.identifier} · ${task.title} (${task.status})`)
      .join("\n")
    return `- **${list.name}** (${listTasks.length} cards)${preview ? `\n${preview}` : " — _empty_"}`
  })

  const inboxTasks = (tasks ?? []).filter((task) => {
    const list = task.list_id ? listById.get(task.list_id) : null
    return list?.board_key === "dev" && list.name.toLowerCase() === "inbox"
  })

  const { data: loreEntries } = await supabase
    .from("lore_entries")
    .select("name, slug, entry_type, summary")
    .eq("project_id", projectId)
    .neq("canon_status", "archived")
    .order("updated_at", { ascending: false })
    .limit(40)

  const loreLines =
    loreEntries
      ?.map((entry) => `- ${entry.name} (${entry.entry_type}): ${entry.summary ?? "(no summary)"}`)
      .join("\n") ?? "(none)"

  return [
    "## Roadmap board lists (milestones)",
    roadmapLines.length ? roadmapLines.join("\n") : "(no roadmap lists)",
    "",
    "## Dev Inbox (untriaged cards)",
    inboxTasks.length
      ? inboxTasks.map((task) => `- ${task.identifier} · ${task.title}`).join("\n")
      : "(empty)",
    "",
    "## Lore library snapshot",
    loreLines,
  ].join("\n")
}

export async function runSoulsRepoDocsSync(input: {
  projectId: string
  branch?: string
  trigger?: string
}) {
  if (!isAdminClientConfigured()) {
    return { skipped: true, reason: "Admin client not configured." }
  }

  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, workspace_id, slug, name, github_owner, github_repo_name, game_status_path, game_status_sync_enabled, lore_doc_path, lore_doc_sync_enabled"
    )
    .eq("id", input.projectId)
    .maybeSingle()

  if (!project?.github_owner || !project.github_repo_name) {
    return { skipped: true, reason: "GitHub repo not linked." }
  }

  if (project.lore_doc_sync_enabled === false) {
    return { skipped: true, reason: "Lore doc sync disabled." }
  }

  const token = await getGithubTokenForProjectAdmin(project.id)
  if (!token) {
    return { skipped: true, reason: "No GitHub token available." }
  }

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("openrouter_api_key, openrouter_model")
    .eq("id", project.workspace_id)
    .maybeSingle()

  if (!workspace?.openrouter_api_key) {
    return { skipped: true, reason: "OpenRouter not configured." }
  }

  const repoRef = await getGithubRepoRef(token, project.github_owner, project.github_repo_name)
  if (!repoRef) {
    return { skipped: true, reason: "Could not read GitHub repo." }
  }

  const branch = input.branch ?? repoRef.defaultBranch
  const headSha = await getGithubBranchHeadSha(
    token,
    project.github_owner,
    project.github_repo_name,
    branch
  )

  if (!headSha) {
    return { skipped: true, reason: "Could not resolve branch head." }
  }

  const loreDocPath = project.lore_doc_path || "docs/loredoc.md"
  const statusPath = project.game_status_path || "docs/GAME_STATUS.md"

  const loreMarkdown = await buildLoreDocMarkdown(supabase, project.id, project.name)
  const currentLoreDoc = await getGithubFileContent(
    token,
    project.github_owner,
    project.github_repo_name,
    loreDocPath,
    headSha
  )

  let loreDocCommitted = false
  if (loreMarkdown.trim() !== currentLoreDoc.content.trim()) {
    await putGithubFileContent(
      token,
      project.github_owner,
      project.github_repo_name,
      loreDocPath,
      branch,
      `Souls: sync lore document from DevelopmentOS (${input.trigger ?? "manual"})`,
      loreMarkdown,
      currentLoreDoc.sha
    )
    loreDocCommitted = true
  }

  let gameStatusCommitted = false
  let summary = loreDocCommitted
    ? "Exported DevelopmentOS lore to loredoc.md."
    : "loredoc.md already matched DevelopmentOS lore."

  if (project.game_status_sync_enabled !== false) {
    const gameStatusFile = await getGithubFileContent(
      token,
      project.github_owner,
      project.github_repo_name,
      statusPath,
      headSha
    )

    const gapContext = await buildDocsGapContext(supabase, project.id)

    const raw = await chatWithOpenRouter({
      apiKey: workspace.openrouter_api_key,
      model: workspace.openrouter_model ?? "google/gemini-2.0-flash-001",
      temperature: 0.2,
      maxTokens: 12000,
      messages: [
        { role: "system", content: SOULS_REPO_DOCS_SYNC_SYSTEM_PROMPT },
        {
          role: "user",
          content: JSON.stringify({
            trigger: input.trigger ?? "manual",
            game_status_path: statusPath,
            current_game_status_markdown: gameStatusFile.content,
            developmentos_context: gapContext,
          }),
        },
      ],
    })

    const plan = docsPlanSchema.parse(parseJsonResponse(raw))
    summary = [summary, plan.summary].filter(Boolean).join(" ")

    if (
      plan.game_status_changed &&
      plan.game_status_markdown?.trim() &&
      plan.game_status_markdown.trim() !== gameStatusFile.content.trim()
    ) {
      await putGithubFileContent(
        token,
        project.github_owner,
        project.github_repo_name,
        statusPath,
        branch,
        `Souls: update GAME_STATUS from DevelopmentOS (${input.trigger ?? "manual"})`,
        plan.game_status_markdown.trimEnd() + "\n",
        gameStatusFile.sha
      )
      gameStatusCommitted = true
    }
  }

  await supabase.rpc("log_github_activity_event", {
    p_workspace_id: project.workspace_id,
    p_project_id: project.id,
    p_event_type: "souls.repo_docs_sync",
    p_entity_type: "project",
    p_entity_id: project.id,
    p_new_value: {
      trigger: input.trigger ?? "manual",
      lore_doc_path: loreDocPath,
      lore_doc_committed: loreDocCommitted,
      game_status_committed: gameStatusCommitted,
      branch,
    },
    p_message: summary,
  })

  return {
    skipped: false,
    loreDocCommitted,
    gameStatusCommitted,
    summary,
  }
}

export async function shouldRunLoreDocSyncForPush(input: {
  projectId: string
  loreDocPath: string
  commitSha: string
  commits: Array<{ message?: string; added?: string[]; modified?: string[]; removed?: string[] }>
  headCommit?: { message?: string; added?: string[]; modified?: string[]; removed?: string[] } | null
}) {
  const touched = (commits: typeof input.commits) =>
    commits.some((commit) =>
      commitTouchesDocFile(commit, input.loreDocPath, ["loredoc", "lore doc"])
    )

  if (input.headCommit && commitTouchesDocFile(input.headCommit, input.loreDocPath, ["loredoc"])) {
    return true
  }

  if (touched(input.commits)) {
    return true
  }

  const token = await getGithubTokenForProjectAdmin(input.projectId)
  if (!token) {
    return false
  }

  const { data: project } = await createAdminClient()
    .from("projects")
    .select("github_owner, github_repo_name")
    .eq("id", input.projectId)
    .maybeSingle()

  if (!project?.github_owner || !project.github_repo_name) {
    return false
  }

  try {
    const files = await getGithubCommitChangedFiles(
      token,
      project.github_owner,
      project.github_repo_name,
      input.commitSha
    )
    return commitTouchesDocFile({ modified: files }, input.loreDocPath, ["loredoc"])
  } catch {
    return false
  }
}
