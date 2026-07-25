import { after } from "next/server"
import { NextResponse } from "next/server"

import {
  exportLoreDocToGithub,
  finalizeDocsSync,
  runGameStatusGapFill,
} from "@/lib/agents/run-souls-repo-docs-sync"
import { requireProject } from "@/lib/auth/project-context"
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

  try {
    const { slug } = await params
    const { project } = await requireProject(slug)

    if (project.lore_doc_sync_enabled === false) {
      return NextResponse.json({ error: "Lore doc sync is disabled for this project." }, { status: 400 })
    }

    if (!project.github_owner || !project.github_repo_name) {
      return NextResponse.json({ error: "Link a GitHub repository first." }, { status: 400 })
    }

    const loreResult = await exportLoreDocToGithub({
      projectId: project.id,
      trigger: "manual",
    })

    if (loreResult.skipped) {
      return NextResponse.json({ error: loreResult.reason ?? "Sync skipped." }, { status: 400 })
    }

    after(async () => {
      let gameStatusCommitted = false
      let gameStatusSummary = ""
      let gameStatusError: string | undefined

      try {
        const gameResult = await runGameStatusGapFill({
          projectId: project.id,
          trigger: "manual",
        })
        gameStatusCommitted = gameResult.committed
        gameStatusSummary = gameResult.summary
        gameStatusError = gameResult.error
      } catch (error) {
        gameStatusError =
          error instanceof Error ? error.message : "GAME_STATUS review failed."
      }

      const summary = [loreResult.summary, gameStatusSummary].filter(Boolean).join(" ")

      await finalizeDocsSync({
        projectId: project.id,
        loreDocCommitted: loreResult.loreDocCommitted ?? false,
        gameStatusCommitted,
        summary,
        gameStatusError,
        trigger: "manual",
      })
    })

    return NextResponse.json({
      ok: true,
      loreDocCommitted: loreResult.loreDocCommitted ?? false,
      gameStatusPending: true,
      summary: loreResult.summary,
      message:
        (loreResult.loreDocCommitted
          ? "Lore exported to GitHub."
          : "Loredoc already matched DevelopmentOS.") +
        " Souls will message you in Inbox when the GAME_STATUS review finishes.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Docs sync failed."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
