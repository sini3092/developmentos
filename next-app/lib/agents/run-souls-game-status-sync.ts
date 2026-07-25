import { z } from "zod"

import { runSoulsGameStatusLoreEnrichment } from "@/lib/agents/run-souls-game-status-lore"
import type { GameStatusLoreEnrichmentResult } from "@/lib/agents/run-souls-game-status-lore"
import { applyGameStatusMarkdownUpdates } from "@/lib/imports/apply-game-status-updates"
import { getGithubCommitChangedFiles, getGithubFileContent } from "@/lib/github/content"
import {
  gameStatusTouched,
  pathsTouchGameStatus,
  type GameStatusCommitFiles,
} from "@/lib/github/game-status-touched"
import { getGithubTokenForProjectAdmin } from "@/lib/github/project-token"
import { pushTouchesOnlySoulsOutboundDocs } from "@/lib/github/souls-commits"
import { gameStatusSyncAlreadyRan } from "@/lib/agents/souls-sync-guards"
import { SOULS_GAME_STATUS_SYNC_SYSTEM_PROMPT } from "@/lib/agents/souls-game-status-sync-prompt"
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
  applied: Awaited<ReturnType<typeof applyGameStatusMarkdownUpdates>>,
  lore?: GameStatusLoreEnrichmentResult
) {
  const lines = [plan.inbox_body.trim()]

  if (applied.applied.length > 0) {
    lines.push("", "DevelopmentOS updates applied:")
    for (const update of applied.applied) {
      const parts = [
        `- ${update.identifier} · ${update.title}`,
        update.status ? `status → ${update.status.replace(/_/g, " ")}` : null,
        update.listName ? `moved to ${update.listName}` : null,
        update.systemsListName && !update.listName
          ? `stays on systems · ${update.systemsListName}`
          : null,
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

  if (lore && !lore.skipped && lore.entriesEnriched > 0) {
    lines.push(
      "",
      `Lore enriched: ${lore.entriesEnriched} entr${lore.entriesEnriched === 1 ? "y" : "ies"} updated across ${lore.rounds} round${lore.rounds === 1 ? "" : "s"}.`
    )
  } else if (lore && !lore.skipped && lore.rounds > 0) {
    lines.push("", "Lore review: checked thin entries — no new lore content was needed this push.")
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
  project: Pick<SyncProject, "id" | "workspace_id" | "slug" | "name">,
  input: { title: string; body: string; metadata?: Record<string, unknown> }
) {
  return notifyProjectMembersSoulsGameStatus(supabase, {
    workspaceId: project.workspace_id,
    projectId: project.id,
    projectSlug: project.slug,
    projectName: project.name,
    title: input.title,
    body: input.body,
    metadata: input.metadata ?? {},
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

  if (
    pushTouchesOnlySoulsOutboundDocs({
      commits: input.commits,
      headCommit: input.headCommit,
    })
  ) {
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

  if (await gameStatusSyncAlreadyRan(project.id, input.commitSha)) {
    return { skipped: true, reason: "This commit was already reviewed by Souls." }
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
        content: SOULS_GAME_STATUS_SYNC_SYSTEM_PROMPT,
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

  let loreEnrichment: GameStatusLoreEnrichmentResult = {
    skipped: true,
    reason: "Not started",
    rounds: 0,
    entriesEnriched: 0,
    actions: [],
  }

  try {
    loreEnrichment = await runSoulsGameStatusLoreEnrichment({
      projectId: project.id,
      projectSlug: project.slug,
      workspaceId: project.workspace_id,
      gameStatusMarkdown: file.content,
      statusPath,
      branch: input.branch,
      commitSha: input.commitSha,
    })
  } catch (error) {
    console.error("Souls GAME_STATUS lore enrichment failed:", error)
  }

  const inboxTitle =
    applied.applied.length > 0
      ? plan.inbox_title
      : plan.inbox_title.includes("reviewed")
        ? plan.inbox_title
        : `Souls reviewed ${statusPath}`

  const inboxBody = buildInboxBody(plan, applied, loreEnrichment)

  const notifiedCount = await notifyProjectMembersSoulsGameStatus(supabase, {
    workspaceId: project.workspace_id,
    projectId: project.id,
    projectSlug: project.slug,
    projectName: project.name,
    title: inboxTitle,
    body: inboxBody,
    metadata: {
      commit_sha: input.commitSha,
      branch: input.branch,
      status_path: statusPath,
      outcome: plan.outcome,
      tasks_updated: applied.tasksUpdated,
      tasks_created: applied.tasksCreated,
      comments_added: applied.commentsAdded,
      checklist_updates: applied.checklistsUpdated,
      list_moves: applied.listMoves,
      lore_entries_enriched: loreEnrichment.entriesEnriched,
      lore_rounds: loreEnrichment.rounds,
    },
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
      lore_entries_enriched: loreEnrichment.entriesEnriched,
      lore_rounds: loreEnrichment.rounds,
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
    .select("id, workspace_id, slug, name")
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
