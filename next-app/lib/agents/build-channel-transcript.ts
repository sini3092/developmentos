import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"

type QueryClient = SupabaseClient<Database>

type ChannelMessageRow = {
  id: string
  body: string
  created_at: string
  parent_message_id: string | null
  agent_name: string | null
  author_id: string | null
}

function speakerLabel(
  message: ChannelMessageRow,
  profiles: Map<string, string>
) {
  if (message.agent_name === "souls") {
    return "Souls"
  }
  if (message.agent_name === "personal") {
    return "Personal"
  }
  const name = message.author_id ? profiles.get(message.author_id) : null
  return name ?? "Teammate"
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return "??:??"
  }
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export async function buildChannelTranscript(
  supabase: QueryClient,
  channelId: string,
  options: {
    limit?: number
    beforeMessageId?: string | null
  } = {}
) {
  const limit = options.limit ?? 30

  let query = supabase
    .from("channel_messages")
    .select("id, body, created_at, parent_message_id, agent_name, author_id")
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (options.beforeMessageId) {
    const { data: anchor } = await supabase
      .from("channel_messages")
      .select("created_at")
      .eq("id", options.beforeMessageId)
      .maybeSingle()

    if (anchor?.created_at) {
      query = query.lte("created_at", anchor.created_at)
    }
  }

  const { data: messages } = await query

  if (!messages?.length) {
    return "No prior messages in this channel."
  }

  const authorIds = [
    ...new Set(
      messages
        .map((message) => message.author_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const { data: profiles } =
    authorIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", authorIds)
      : { data: [] as Array<{ id: string; display_name: string | null }> }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name ?? "Teammate"])
  )

  const chronological = [...messages].reverse()

  return chronological
    .map((message) => {
      const speaker = speakerLabel(message, profileMap)
      const preview = message.body.trim().replace(/\s+/g, " ").slice(0, 600)
      const suffix = message.body.length > 600 ? "…" : ""
      return `[${formatTimestamp(message.created_at)}] ${speaker}: ${preview}${suffix}`
    })
    .join("\n")
}
