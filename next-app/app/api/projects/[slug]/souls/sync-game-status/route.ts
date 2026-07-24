import { NextResponse } from "next/server"

import { runSoulsGameStatusSync } from "@/lib/agents/run-souls-game-status-sync"
import { requireProject } from "@/lib/auth/project-context"
import { getGithubBranchHeadSha } from "@/lib/github/content"
import { getGithubTokenForProjectAdmin } from "@/lib/github/project-token"
import { isAdminClientConfigured } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const maxDuration = 300

type SyncRouteProps = {
  params: Promise<{ slug: string }>
}

export async function POST(_request: Request, { params }: SyncRouteProps) {
  if (!isAdminClientConfigured()) {
    return NextResponse.json({ error: "Server sync is not configured." }, { status: 503 })
  }

  const { slug } = await params
  const { project } = await requireProject(slug)

  if (!project.game_status_sync_enabled) {
    return NextResponse.json({ error: "GAME_STATUS sync is disabled for this project." }, { status: 400 })
  }

  if (!project.github_owner || !project.github_repo_name) {
    return NextResponse.json({ error: "Link a GitHub repository first." }, { status: 400 })
  }

  const token = await getGithubTokenForProjectAdmin(project.id)
  if (!token) {
    return NextResponse.json(
      { error: "No GitHub token available. Connect GitHub in Settings." },
      { status: 400 }
    )
  }

  const branch = "main"
  const commitSha = await getGithubBranchHeadSha(
    token,
    project.github_owner,
    project.github_repo_name,
    branch
  )

  if (!commitSha) {
    return NextResponse.json({ error: "Could not resolve latest commit on GitHub." }, { status: 400 })
  }

  try {
    const result = await runSoulsGameStatusSync({
      projectId: project.id,
      branch,
      commitSha,
      commits: [
        {
          id: commitSha,
          message: "Manual Souls GAME_STATUS sync",
          modified: [project.game_status_path ?? "docs/GAME_STATUS.md"],
        },
      ],
    })

    if (result.skipped) {
      return NextResponse.json({ ok: false, skipped: true, reason: result.reason }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      outcome: result.outcome,
      notificationsSent: result.notificationsSent,
      tasksUpdated: result.tasksUpdated,
      tasksCreated: result.tasksCreated,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Souls sync failed."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
