import { NextResponse } from "next/server"

import { searchWorkspace, type SearchResultType } from "@/lib/auth/search-context"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q") ?? ""
  const type = (searchParams.get("type") as SearchResultType | null) ?? "all"
  const project = searchParams.get("project") ?? undefined

  if (query.trim().length < 2) {
    return NextResponse.json({ results: [] })
  }

  const results = await searchWorkspace(query, {
    type,
    projectSlug: project,
    limit: 6,
  })

  return NextResponse.json({ results })
}
