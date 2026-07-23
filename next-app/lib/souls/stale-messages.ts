import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Json } from "@/lib/database.types"
import { parseSoulsMessageMetadata } from "@/lib/souls/message-metadata"

type Client = SupabaseClient<Database>

export const SOULS_STALE_WORKING_MS = 4 * 60 * 1000

export function getSoulsMessageActivityAt(message: {
  created_at: string
  metadata: unknown
}) {
  const metadata = parseSoulsMessageMetadata(
    message.metadata as Database["public"]["Tables"]["souls_private_messages"]["Row"]["metadata"]
  )
  const lastActivityAt = metadata.lastActivityAt
  if (lastActivityAt) {
    return new Date(lastActivityAt).getTime()
  }
  return new Date(message.created_at).getTime()
}

export function isSoulsMessageStale(message: {
  status: string
  created_at: string
  metadata: unknown
}) {
  if (message.status !== "working") {
    return false
  }
  return Date.now() - getSoulsMessageActivityAt(message) > SOULS_STALE_WORKING_MS
}

export async function recoverStaleSoulsMessages(
  supabase: Client,
  conversationId: string
) {
  const { data: messages } = await supabase
    .from("souls_private_messages")
    .select("id, status, created_at, metadata")
    .eq("conversation_id", conversationId)
    .eq("status", "working")

  if (!messages?.length) {
    return 0
  }

  let recovered = 0

  for (const message of messages) {
    if (!isSoulsMessageStale(message)) {
      continue
    }

    const metadata = parseSoulsMessageMetadata(message.metadata)
    const hasActions = (metadata.actions?.length ?? 0) > 0
    const partialReply = hasActions
      ? "Souls was interrupted, but the work above was saved. Send \"continue\" if you want her to finish."
      : "Souls timed out before she could respond. Try sending your message again."

    await supabase
      .from("souls_private_messages")
      .update({
        body: partialReply,
        status: hasActions ? "complete" : "error",
        metadata: JSON.parse(
          JSON.stringify({
            ...metadata,
            workingLabel: undefined,
            recoveredFromStale: true,
          })
        ) as Json,
      })
      .eq("id", message.id)

    recovered += 1
  }

  return recovered
}
