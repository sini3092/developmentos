import { z } from "zod"

import { getGithubFileContent, putGithubFileContent } from "@/lib/github/content"
import { getGithubTokenForProjectAdmin } from "@/lib/github/project-token"
import { normalizeTaskTitle } from "@/lib/imports/task-dedup"
import { chatWithOpenRouter } from "@/lib/openrouter/chat"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"

const syncPlanSchema = z.object({
  should_update_file: z.boolean(),
  summary: z.string(),
  updated_markdown: z.string().optional(),
  task_updates: z
    .array(
      z.object({
        title: z.string(),
        status: z.enum(["done", "in_progress", "backlog", "ready", "blocked"]).optional(),
        note: z.string().optional(),
      })
    )
    .optional(),
})

function parseJsonResponse(text: string) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(raw) as unknown
}

function gameStatusTouched(commits: Array<{ added?: string[]; modified?: string[]; removed?: string[] }>, path: string) {
  const normalized = path.replace(/\\/g, "/")
  return commits.some(
    (commit) =>
      commit.added?.includes(normalized) ||
      commit.modified?.includes(normalized) ||
      commit.removed?.includes(normalized)
  )
}

export async function runSoulsGameStatusSync(input: {
  projectId: string
  branch: string
  commitSha: string
  commits: Array<{ id: string; message: string; added?: string[]; modified?: string[]; removed?: string[] }>
}) {
  if (!isAdminClientConfigured()) {
    return { skipped: true, reason: "Admin client not configured." }
  }

  const supabase = createAdminClient()

  const { data: project } = await supabase
    .from("projects")
    .select(
      "id, workspace_id, slug, name, github_owner, github_repo_name, game_status_path, game_status_sync_enabled"
    )
    .eq("id", input.projectId)
    .maybeSingle()

  if (!project?.game_status_sync_enabled || !project.github_owner || !project.github_repo_name) {
    return { skipped: true, reason: "Game status sync disabled or GitHub repo not linked." }
  }

  const statusPath = project.game_status_path || "docs/GAME_STATUS.md"
  if (!gameStatusTouched(input.commits, statusPath)) {
    return { skipped: true, reason: "GAME_STATUS.md not changed in this push." }
  }

  const token = await getGithubTokenForProjectAdmin(project.id)
  if (!token) {
    return { skipped: true, reason: "No GitHub token available for project members." }
  }

  const file = await getGithubFileContent(
    token,
    project.github_owner,
    project.github_repo_name,
    statusPath,
    input.commitSha
  )

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, status, priority, identifier, list_id, milestone_id, updated_at")
    .eq("project_id", project.id)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false })
    .limit(120)

  const { data: lists } = await supabase
    .from("board_lists")
    .select("id, name, board_key")
    .eq("project_id", project.id)

  const listById = new Map((lists ?? []).map((list) => [list.id, list]))

  const taskSummary = (tasks ?? []).map((task) => ({
    identifier: task.identifier,
    title: task.title,
    status: task.status,
    board: task.list_id ? listById.get(task.list_id)?.board_key ?? null : null,
    list: task.list_id ? listById.get(task.list_id)?.name ?? null : null,
    updated_at: task.updated_at,
  }))

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("openrouter_api_key, openrouter_model")
    .eq("id", project.workspace_id)
    .maybeSingle()

  if (!workspace?.openrouter_api_key) {
    return { skipped: true, reason: "OpenRouter is not configured for this workspace." }
  }

  const latestCommit = input.commits.at(-1)
  const response = await chatWithOpenRouter({
    apiKey: workspace.openrouter_api_key,
    model: workspace.openrouter_model ?? "google/gemini-2.0-flash-001",
    temperature: 0.2,
    maxTokens: 6000,
    messages: [
      {
        role: "system",
        content: `You are Souls, syncing a living game status markdown file with DevelopmentOS task data.
Rules:
- Never duplicate sections or checklist items that already exist with the same meaning.
- Prefer updating checkbox states [x], [~], [ ] instead of rewriting whole sections.
- Preserve Norwegian language and document structure when the file is Norwegian.
- Add changelog entries only for meaningful new progress.
- Match tasks by normalized title when updating DevelopmentOS-side status suggestions.
- Do not remove historical changelog entries.
Respond with JSON only:
{
  "should_update_file": boolean,
  "summary": "short summary",
  "updated_markdown": "full updated markdown if should_update_file",
  "task_updates": [{ "title": "...", "status": "done|in_progress|backlog", "note": "..." }]
}`,
      },
      {
        role: "user",
        content: JSON.stringify({
          project: project.name,
          branch: input.branch,
          commit: latestCommit?.message ?? input.commitSha,
          game_status_path: statusPath,
          game_status_markdown: file.content,
          developmentos_tasks: taskSummary,
        }),
      },
    ],
  })

  const plan = syncPlanSchema.parse(parseJsonResponse(response))

  let tasksUpdated = 0
  for (const update of plan.task_updates ?? []) {
    const normalized = normalizeTaskTitle(update.title)
    const task = (tasks ?? []).find((item) => normalizeTaskTitle(item.title) === normalized)
    if (!task || !update.status) {
      continue
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        status: update.status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", task.id)

    if (!error) {
      tasksUpdated += 1
    }
  }

  let fileUpdated = false
  let commitUrl: string | null = null

  if (plan.should_update_file && plan.updated_markdown && plan.updated_markdown !== file.content) {
    const put = await putGithubFileContent(
      token,
      project.github_owner,
      project.github_repo_name,
      statusPath,
      input.branch,
      `chore: Souls sync ${statusPath}`,
      plan.updated_markdown,
      file.sha
    )
    fileUpdated = true
    commitUrl = put.commitUrl
  }

  await supabase.rpc("log_github_activity_event", {
    p_workspace_id: project.workspace_id,
    p_project_id: project.id,
    p_event_type: "souls.game_status_sync",
    p_entity_type: "project",
    p_entity_id: project.id,
    p_new_value: {
      branch: input.branch,
      commit_sha: input.commitSha,
      summary: plan.summary,
      file_updated: fileUpdated,
      tasks_updated: tasksUpdated,
      commit_url: commitUrl,
    },
    p_message: `Souls synced ${statusPath}: ${plan.summary}`,
  })

  return {
    skipped: false,
    summary: plan.summary,
    fileUpdated,
    tasksUpdated,
    commitUrl,
  }
}

export function shouldRunGameStatusSync(
  commits: Array<{ added?: string[]; modified?: string[]; removed?: string[] }>,
  statusPath: string
) {
  return gameStatusTouched(commits, statusPath)
}
