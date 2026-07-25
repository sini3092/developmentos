import { createAdminClient } from "@/lib/supabase/admin"

const MANUAL_DOCS_TRIGGERS = new Set([
  "manual",
  "souls_private_tool",
  "souls_chat_intent",
])

const AUTOMATIC_DOCS_TRIGGERS = new Set([
  "after_game_status_sync",
  "loredoc_push",
  "webhook",
])

export function isManualDocsTrigger(trigger?: string) {
  return MANUAL_DOCS_TRIGGERS.has(trigger ?? "")
}

export function isAutomaticDocsTrigger(trigger?: string) {
  return AUTOMATIC_DOCS_TRIGGERS.has(trigger ?? "") || !trigger
}

export function allowsGameStatusGapFill(trigger?: string) {
  return isManualDocsTrigger(trigger)
}

export async function gameStatusSyncAlreadyRan(projectId: string, commitSha: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from("activity_events")
    .select("id")
    .eq("project_id", projectId)
    .eq("event_type", "souls.game_status_sync")
    .filter("new_value->>commit_sha", "eq", commitSha)
    .limit(1)
    .maybeSingle()

  return Boolean(data)
}

export async function recentOpenRouterSoulRun(input: {
  projectId: string
  eventType: string
  withinMs?: number
}) {
  const supabase = createAdminClient()
  const since = new Date(Date.now() - (input.withinMs ?? 120_000)).toISOString()
  const { data } = await supabase
    .from("activity_events")
    .select("id, created_at")
    .eq("project_id", input.projectId)
    .eq("event_type", input.eventType)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  return Boolean(data)
}
