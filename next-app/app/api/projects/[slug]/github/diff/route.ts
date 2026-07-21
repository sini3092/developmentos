import { NextResponse } from "next/server"

import { requireProject } from "@/lib/auth/project-context"
import { getGithubAccessToken } from "@/lib/auth/integrations-context"
import { fetchGithubCommitDiff, fetchGithubCompareDiff } from "@/lib/github/diff"

type DiffRouteProps = {
  params: Promise<{ slug: string }>
}

export async function GET(request: Request, { params }: DiffRouteProps) {
  const { slug } = await params
  const { project } = await requireProject(slug)
  const token = await getGithubAccessToken()

  if (!token) {
    return NextResponse.json(
      { error: "Connect your GitHub account in Settings to view diffs." },
      { status: 401 }
    )
  }

  const owner =
    new URL(request.url).searchParams.get("owner") ?? project.github_owner ?? ""
  const repo = new URL(request.url).searchParams.get("repo") ?? project.github_repo_name ?? ""
  const before = new URL(request.url).searchParams.get("before")
  const after = new URL(request.url).searchParams.get("after")
  const sha = new URL(request.url).searchParams.get("sha")

  if (!owner || !repo) {
    return NextResponse.json({ error: "Repository not linked to this project." }, { status: 400 })
  }

  if (sha) {
    const diff = await fetchGithubCommitDiff(token, owner, repo, sha)
    if (!diff) {
      return NextResponse.json({ error: "Could not load commit diff from GitHub." }, { status: 404 })
    }
    return NextResponse.json(diff)
  }

  if (before && after) {
    const diff = await fetchGithubCompareDiff(token, owner, repo, before, after)
    if (!diff) {
      return NextResponse.json({ error: "Could not load compare diff from GitHub." }, { status: 404 })
    }
    return NextResponse.json(diff)
  }

  return NextResponse.json({ error: "Provide sha or before+after query params." }, { status: 400 })
}
