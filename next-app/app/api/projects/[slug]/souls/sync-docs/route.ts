import { NextResponse } from "next/server"

import { runSoulsRepoDocsSync } from "@/lib/agents/run-souls-repo-docs-sync"
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

  const { slug } = await params
  const { project } = await requireProject(slug)

  if (project.lore_doc_sync_enabled === false) {
    return NextResponse.json({ error: "Lore doc sync is disabled for this project." }, { status: 400 })
  }

  if (!project.github_owner || !project.github_repo_name) {
    return NextResponse.json({ error: "Link a GitHub repository first." }, { status: 400 })
  }

  const result = await runSoulsRepoDocsSync({
    projectId: project.id,
    trigger: "manual",
  })

  if (result.skipped) {
    return NextResponse.json({ error: result.reason ?? "Sync skipped." }, { status: 400 })
  }

  return NextResponse.json(result)
}
