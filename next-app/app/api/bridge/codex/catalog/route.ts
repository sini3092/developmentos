import { NextResponse } from "next/server"

import { authenticateBridgeToken } from "@/lib/bridge/auth"
import type { Database } from "@/lib/database.types"
import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"

type CodexCatalogUpsert = Database["public"]["Tables"]["user_codex_settings"]["Insert"]

export async function POST(request: Request) {
  if (!isAdminClientConfigured()) {
    return NextResponse.json({ error: "Bridge API is not configured." }, { status: 503 })
  }

  const auth = await authenticateBridgeToken(request)
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 })
  }

  const body = (await request.json()) as {
    workspaces?: string[]
    models?: string[]
    project_paths?: string[]
  }

  const workspaces = (body.workspaces ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 50)
  const models = (body.models ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 50)
  const projectPaths = (body.project_paths ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 50)

  const supabase = createAdminClient()
  const payload: CodexCatalogUpsert = {
    user_id: auth.userId,
    discovered_workspaces: workspaces,
    discovered_project_paths: projectPaths,
    discovered_models: models,
    catalog_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from("user_codex_settings").upsert(payload, { onConflict: "user_id" })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
