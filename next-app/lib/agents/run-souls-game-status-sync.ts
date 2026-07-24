import { z } from "zod"

import { applyGameStatusMarkdownUpdates } from "@/lib/imports/apply-game-status-updates"
import { getGithubCommitChangedFiles, getGithubFileContent } from "@/lib/github/content"
import {
  gameStatusTouched,
  pathsTouchGameStatus,
  type GameStatusCommitFiles,
} from "@/lib/github/game-status-touched"
import { getGithubTokenForProjectAdmin } from "@/lib/github/project-token"
import { chatWithOpenRouter } from "@/lib/openrouter/chat"
import { notifyProjectMembersSoulsGameStatus } from "@/lib/souls/game-status-notifications"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"
import { resolveProjectCommentAuthor } from "@/lib/tasks/souls-board-helpers"

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

type SyncProject = {
  id: string
  workspace_id: string
  slug: string
  name: string
  github_owner: string | null
  github_repo_name: string | null
  game_status_path: string | null
  game_status_sync_enabled: boolean | null
}

function parseJsonResponse(text: string) {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const raw = fenced ? fenced[1].trim() : trimmed
  return JSON.parse(raw) as unknown
}

function buildInboxBody(
  plan: z.infer<typeof syncPlanSchema>,
  applied: Awaited<ReturnType<typeof applyGameStatusMarkdownUpdates>>
) {
  const lines = [plan.inbox_body.trim()]

  if (applied.applied.length > 0) {
    lines.push("", "DevelopmentOS updates applied:")
    for (const update of applied.applied) {
      const parts = [
        `- ${update.identifier} · ${update.title}`,
        update.status ? `status → ${update.status.replace(/_/g, " ")}` : null,
        update.listName ? `moved to ${update.listName}` : null,
        update.checklistChanges
          ? `${update.checklistChanges} checklist item${update.checklistChanges === 1 ? "" : "s"} updated`
          : null,
        update.commentChanges
          ? `${update.commentChanges} comment${update.commentChanges === 1 ? "" : "s"} added`
          : null,
        update.note ? `(${update.note})` : null,
      ].filter(Boolean)
      lines.push(parts.join(" · "))
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

async function logSoulsGameStatusSyncEvent(
  supabase: ReturnType<typeof createAdminClient>,
  project: Pick<SyncProject, "id" | "workspace_id">,
  input: {
    branch: string
    commitSha: string
    statusPath: string
    outcome: string
    message: string
    details?: Record<string, unknown>
  }
) {
  await supabase.rpc("log_github_activity_event", {
    p_workspace_id: project.workspace_id,
    p_project_id: project.id,
    p_event_type: "souls.game_status_sync",
    p_entity_type: "project",
    p_entity_id: project.id,
    p_new_value: {
      branch: input.branch,
      commit_sha: input.commitSha,
      status_path: input.statusPath,
      outcome: input.outcome,
      ...input.details,
    },
    p_message: input.message,
  })
}

async function notifySoulsGameStatusIssue(
  supabase: ReturnType<typeof createAdminClient>,
  project: Pick<SyncProject, "id" | "workspace_id" | "slug">,
  input: { title: string; body: string }
) {
  return notifyProjectMembersSoulsGameStatus(supabase, {
    workspaceId: project.workspace_id,
    projectId: project.id,
    projectSlug: project.slug,
    title: input.title,
    body: input.body,
  })
}

async function resolveGameStatusTouched(input: {
  commits: GameStatusCommitFiles[]
  headCommit?: GameStatusCommitFiles | null
  statusPath: string
  commitSha: string
  githubOwner: string
  githubRepoName: string
  projectId: string
}) {
  if (gameStatusTouched(input.commits, input.statusPath, input.headCommit)) {
    return true
  }

  const token = await getGithubTokenForProjectAdmin(input.projectId)
  if (!token) {
    return false
  }

  try {
    const files = await getGithubCommitChangedFiles(
      token,
      input.githubOwner,
      input.githubRepoName,
      input.commitSha
    )
    return pathsTouchGameStatus(files, input.statusPath)
  } catch {
    return false
  }
}

export async function shouldRunGameStatusSyncForPush(input: {
  projectId: string
  githubOwner: string | null
  githubRepoName: string | null
  gameStatusPath: string
  commitSha: string | null
  commits: GameStatusCommitFiles[]
  headCommit?: GameStatusCommitFiles | null
}) {
  if (!input.commitSha || !input.githubOwner || !input.githubRepoName) {
    return false
  }

  return resolveGameStatusTouched({
    commits: input.commits,
    headCommit: input.headCommit,
    statusPath: input.gameStatusPath,
    commitSha: input.commitSha,
    githubOwner: input.githubOwner,
    githubRepoName: input.githubRepoName,
    projectId: input.projectId,
  })
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
  headCommit?: GameStatusCommitFiles | null
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
  const touched = await resolveGameStatusTouched({
    commits: input.commits,
    headCommit: input.headCommit,
    statusPath,
    commitSha: input.commitSha,
    githubOwner: project.github_owner,
    githubRepoName: project.github_repo_name,
    projectId: project.id,
  })

  if (!touched) {
    return { skipped: true, reason: "GAME_STATUS.md not changed in this push." }
  }

  const token = await getGithubTokenForProjectAdmin(project.id)
  if (!token) {
    const reason =
      "Souls could not review GAME_STATUS.md because no GitHub token is available for this project."
    await notifySoulsGameStatusIssue(supabase, project, {
      title: "Souls GAME_STATUS review skipped",
      body: reason,
    })
    await logSoulsGameStatusSyncEvent(supabase, project, {
      branch: input.branch,
      commitSha: input.commitSha,
      statusPath,
      outcome: "skipped",
      message: reason,
      details: { reason: "missing_github_token" },
    })
    return { skipped: true, reason }
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
    const reason =
      "Souls could not review GAME_STATUS.md because OpenRouter is not configured for this workspace."
    await notifySoulsGameStatusIssue(supabase, project, {
      title: "Souls GAME_STATUS review skipped",
      body: reason,
    })
    await logSoulsGameStatusSyncEvent(supabase, project, {
      branch: input.branch,
      commitSha: input.commitSha,
      statusPath,
      outcome: "skipped",
      message: reason,
      details: { reason: "missing_openrouter" },
    })
    return { skipped: true, reason }
  }

  const latestCommit = input.commits.at(-1) ?? input.headCommit
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
- The server will automatically match [x], [~], and [ ] checkbox lines to tasks and checklist items, move dev-board cards between lists when appropriate, add blockquote comments from each ## section to the matching card, create missing cards/checklist items from GAME_STATUS.md, and create missing board lists when needed.
- Section headings (## Feature Name) should match DevelopmentOS card titles. Blockquotes (> text) and !comment lines under a section become card comments.
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

  const commentAuthorId = await resolveProjectCommentAuthor(supabase, project.id)

  const applied = await applyGameStatusMarkdownUpdates(supabase, {
    projectId: project.id,
    workspaceId: project.workspace_id,
    userId: commentAuthorId,
    markdown: file.content,
    commentAuthorId,
    explicitTaskUpdates: plan.task_updates,
  })

  const inboxTitle =
    applied.applied.length > 0
      ? plan.inbox_title
      : plan.inbox_title.includes("reviewed")
        ? plan.inbox_title
        : `Souls reviewed ${statusPath}`

  const inboxBody = buildInboxBody(plan, applied)

  const notifiedCount = await notifyProjectMembersSoulsGameStatus(supabase, {
    workspaceId: project.workspace_id,
    projectId: project.id,
    projectSlug: project.slug,
    title: inboxTitle,
    body: inboxBody,
  })

  await logSoulsGameStatusSyncEvent(supabase, project, {
    branch: input.branch,
    commitSha: input.commitSha,
    statusPath,
    outcome: plan.outcome,
    message: `Souls reviewed ${statusPath}: ${plan.outcome.replace(/_/g, " ")}`,
    details: {
      tasks_updated: applied.tasksUpdated,
      tasks_created: applied.tasksCreated,
      checklist_updates: applied.checklistsUpdated,
      checklist_items_added: applied.checklistsAdded,
      comments_added: applied.commentsAdded,
      list_moves: applied.listMoves,
      notifications_sent: notifiedCount,
      inbox_title: inboxTitle,
    },
  })

  return {
    skipped: false,
    outcome: plan.outcome,
    summary: plan.inbox_body,
    tasksUpdated: applied.tasksUpdated,
    tasksCreated: applied.tasksCreated,
    checklistsUpdated: applied.checklistsUpdated,
    checklistsAdded: applied.checklistsAdded,
    commentsAdded: applied.commentsAdded,
    listMoves: applied.listMoves,
    notificationsSent: notifiedCount,
  }
}

export async function reportSoulsGameStatusSyncFailure(input: {
  projectId: string
  branch: string
  commitSha: string
  statusPath: string
  error: unknown
}) {
  if (!isAdminClientConfigured()) {
    return
  }

  const supabase = createAdminClient()
  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id, slug")
    .eq("id", input.projectId)
    .maybeSingle()

  if (!project) {
    return
  }

  const message =
    input.error instanceof Error ? input.error.message : "Unknown error during Souls GAME_STATUS sync."
  const body = `Souls could not finish reviewing ${input.statusPath} after the latest push to ${input.branch}. ${message}`

  await notifySoulsGameStatusIssue(supabase, project, {
    title: "Souls GAME_STATUS review failed",
    body,
  })

  await logSoulsGameStatusSyncEvent(supabase, project, {
    branch: input.branch,
    commitSha: input.commitSha,
    statusPath: input.statusPath,
    outcome: "failed",
    message: body,
    details: { error: message },
  })
}
