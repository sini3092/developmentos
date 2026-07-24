import { z } from "zod"

import { getGithubFileContent } from "@/lib/github/content"
import { getGithubTokenForProjectAdmin } from "@/lib/github/project-token"
import { normalizeTaskTitle } from "@/lib/imports/task-dedup"
import { chatWithOpenRouter } from "@/lib/openrouter/chat"
import { notifyProjectMembersSoulsGameStatus } from "@/lib/souls/game-status-notifications"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"

const syncPlanSchema = z.object({
  outcome: z.enum(["changes_applied", "no_changes_needed"]),
  inbox_title: z.string().min(1),
  inbox_body: z.string().min(1),
  task_updates: z
    .array(
      z.object({
        title: z.string(),
        status: z.enum(["done", "in_progress", "backlog", "ready", "blocked"]).optional(),
        note: z.string().optional(),
      })
    )
    .optional(),
  recommended_game_status_notes: z.array(z.string()).optional(),
})

function parseJsonResponse(text: string) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(raw) as unknown
}

function gameStatusTouched(
  commits: Array<{ added?: string[]; modified?: string[]; removed?: string[] }>,
  path: string
) {
  const normalized = path.replace(/\\/g, "/")
  return commits.some(
    (commit) =>
      commit.added?.includes(normalized) ||
      commit.modified?.includes(normalized) ||
      commit.removed?.includes(normalized)
  )
}

function buildInboxBody(
  plan: z.infer<typeof syncPlanSchema>,
  appliedUpdates: Array<{ identifier: string; title: string; status: string; note?: string }>
) {
  const lines = [plan.inbox_body.trim()]

  if (appliedUpdates.length > 0) {
    lines.push("", "DevelopmentOS updates applied:")
    for (const update of appliedUpdates) {
      lines.push(
        `- ${update.identifier} · ${update.title} → ${update.status.replace(/_/g, " ")}${
          update.note ? ` (${update.note})` : ""
        }`
      )
    }
  }

  if (plan.recommended_game_status_notes?.length) {
    lines.push("", "Suggested GAME_STATUS.md notes (manual — Souls does not edit the file):")
    for (const note of plan.recommended_game_status_notes) {
      lines.push(`- ${note}`)
    }
  }

  return lines.join("\n")
}

export async function runSoulsGameStatusSync(input: {
  projectId: string
  branch: string
  commitSha: string
  commits: Array<{
    id: string
    message: string
    added?: string[]
    modified?: string[]
    removed?: string[]
  }>
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
    board: task.list_id ? (listById.get(task.list_id)?.board_key ?? null) : null,
    list: task.list_id ? (listById.get(task.list_id)?.name ?? null) : null,
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
    maxTokens: 4000,
    messages: [
      {
        role: "system",
        content: `You are Souls, the private game development assistant for DevelopmentOS.

Review the pushed GAME_STATUS.md file against DevelopmentOS task data after a Git commit.

Important rules:
- Write ALL inbox copy in English.
- NEVER modify GAME_STATUS.md yourself. The team owns that file in the game repo.
- You may recommend manual GAME_STATUS edits in recommended_game_status_notes.
- You may suggest DevelopmentOS task status updates when GAME_STATUS checkboxes clearly imply progress.
- Do not duplicate work — only update tasks when the file clearly indicates a status change.
- If nothing in DevelopmentOS needs updating, set outcome to "no_changes_needed" and explain what you checked.
- Always send a helpful inbox message, even when no task updates are needed.

Respond with JSON only:
{
  "outcome": "changes_applied" | "no_changes_needed",
  "inbox_title": "Short inbox title in English",
  "inbox_body": "2-5 sentences in English explaining what you reviewed and what you did or found",
  "task_updates": [{ "title": "...", "status": "done|in_progress|backlog|ready|blocked", "note": "..." }],
  "recommended_game_status_notes": ["optional manual suggestions for the team"]
}`,
      },
      {
        role: "user",
        content: JSON.stringify({
          project: project.name,
          branch: input.branch,
          commit_message: latestCommit?.message ?? input.commitSha,
          game_status_path: statusPath,
          game_status_markdown: file.content,
          developmentos_tasks: taskSummary,
        }),
      },
    ],
  })

  const plan = syncPlanSchema.parse(parseJsonResponse(response))

  const appliedUpdates: Array<{
    identifier: string
    title: string
    status: string
    note?: string
  }> = []

  for (const update of plan.task_updates ?? []) {
    const normalized = normalizeTaskTitle(update.title)
    const task = (tasks ?? []).find((item) => normalizeTaskTitle(item.title) === normalized)
    if (!task || !update.status || task.status === update.status) {
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
      appliedUpdates.push({
        identifier: task.identifier,
        title: task.title,
        status: update.status,
        note: update.note,
      })
    }
  }

  const inboxTitle =
    appliedUpdates.length > 0
      ? plan.inbox_title
      : plan.inbox_title.includes("reviewed")
        ? plan.inbox_title
        : `Souls reviewed ${statusPath}`

  const inboxBody = buildInboxBody(plan, appliedUpdates)

  const notifiedCount = await notifyProjectMembersSoulsGameStatus(supabase, {
    workspaceId: project.workspace_id,
    projectId: project.id,
    projectSlug: project.slug,
    title: inboxTitle,
    body: inboxBody,
  })

  await supabase.rpc("log_github_activity_event", {
    p_workspace_id: project.workspace_id,
    p_project_id: project.id,
    p_event_type: "souls.game_status_sync",
    p_entity_type: "project",
    p_entity_id: project.id,
    p_new_value: {
      branch: input.branch,
      commit_sha: input.commitSha,
      outcome: plan.outcome,
      tasks_updated: appliedUpdates.length,
      notifications_sent: notifiedCount,
      inbox_title: inboxTitle,
    },
    p_message: `Souls reviewed ${statusPath}: ${plan.outcome.replace(/_/g, " ")}`,
  })

  return {
    skipped: false,
    outcome: plan.outcome,
    summary: plan.inbox_body,
    tasksUpdated: appliedUpdates.length,
    notificationsSent: notifiedCount,
  }
}

export function shouldRunGameStatusSync(
  commits: Array<{ added?: string[]; modified?: string[]; removed?: string[] }>,
  statusPath: string
) {
  return gameStatusTouched(commits, statusPath)
}
