import type { Profile } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { requireProject } from "@/lib/auth/project-context"

export type GithubHistoryEvent = {
  id: string
  event_type: string
  message: string | null
  new_value: unknown
  created_at: string
  actor: Pick<Profile, "id" | "display_name" | "avatar_url"> | null
}

export async function getProjectGithubHistory(projectId: string, limit = 50) {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from("activity_events")
    .select("*")
    .eq("project_id", projectId)
    .like("event_type", "github.%")
    .order("created_at", { ascending: false })
    .limit(limit)

  const actorIds = [
    ...new Set(
      (events ?? [])
        .map((event) => event.actor_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const { data: actors } =
    actorIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", actorIds)
      : { data: [] as Pick<Profile, "id" | "display_name" | "avatar_url">[] }

  return (events ?? []).map((event) => ({
    id: event.id,
    event_type: event.event_type,
    message: event.message,
    new_value: event.new_value,
    created_at: event.created_at,
    actor: actors?.find((actor) => actor.id === event.actor_id) ?? null,
  })) satisfies GithubHistoryEvent[]
}

export async function requireProjectGithubHistory(slug: string) {
  const { project, canManage } = await requireProject(slug)
  const events = await getProjectGithubHistory(project.id)
  return { project, canManage, events }
}
