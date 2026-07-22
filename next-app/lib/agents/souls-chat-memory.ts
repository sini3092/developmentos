import { chatWithOpenRouter } from "@/lib/openrouter/chat"
import type { Json } from "@/lib/database.types"
import { parseSoulsMessageMetadata } from "@/lib/souls/message-metadata"
import { createClient } from "@/lib/supabase/server"

export const SOULS_RECENT_MESSAGE_LIMIT = 16
export const SOULS_COMPACT_MESSAGE_THRESHOLD = 28
export const SOULS_COMPACT_CHAR_THRESHOLD = 12_000

export type SoulsChatHistoryMessage = {
  id: string
  role: "user" | "assistant" | "system"
  body: string
  status: string
  metadata: Json
  created_at: string
}

const COMPACTION_SYSTEM_PROMPT = `You compact private chat history between a game developer and Souls (their lore and task assistant).

Write durable memory Souls must keep for future turns. Use concise markdown sections:
- Lore discussed (names, slugs, types, canon status, key facts from pasted text)
- User preferences and decisions
- Tasks and board changes Souls made or was asked to make
- Open threads / unfinished requests
- World-building facts the user stated that are not yet in lore entries

Preserve proper nouns, slugs, and identifiers exactly. Drop greetings and filler.
Output only the memory document — no preamble.`

export async function loadSoulsChatHistory(conversationId: string, excludeMessageId?: string) {
  const supabase = await createClient()

  const [{ data: conversation }, { data: messages }] = await Promise.all([
    supabase
      .from("souls_private_conversations")
      .select("memory_summary, compacted_through_message_id, compacted_at")
      .eq("id", conversationId)
      .maybeSingle(),
    supabase
      .from("souls_private_messages")
      .select("id, role, body, status, metadata, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true }),
  ])

  const filtered =
    messages?.filter((message) => message.id !== excludeMessageId) ?? []

  return {
    conversation,
    messages: filtered as SoulsChatHistoryMessage[],
  }
}

function estimateTranscriptChars(messages: SoulsChatHistoryMessage[]) {
  return messages.reduce((total, message) => total + message.body.length + 40, 0)
}

function formatMessageForTranscript(message: SoulsChatHistoryMessage) {
  const metadata = parseSoulsMessageMetadata(message.metadata)
  const parts: string[] = []

  if (metadata.attachedLore) {
    const lore = metadata.attachedLore
    parts.push(
      `[Attached lore: ${lore.name} (${lore.entryType}, slug: ${lore.slug})]`,
      lore.summary ? `Summary: ${lore.summary}` : "",
      lore.contentPreview ? `Content preview:\n${lore.contentPreview}` : ""
    )
  }

  if (metadata.actions?.length) {
    const actionLines = metadata.actions.map((action) => {
      const detail = action.summary ?? action.label
      return `- ${action.status === "success" ? "✓" : "✗"} ${detail}`
    })
    parts.push(`[Actions taken]\n${actionLines.join("\n")}`)
  }

  if (message.body.trim()) {
    parts.push(message.body.trim())
  }

  const label = message.role === "user" ? "User" : message.role === "assistant" ? "Souls" : "System"
  return `${label}: ${parts.filter(Boolean).join("\n")}`
}

function collectAttachedLoreSlugs(messages: SoulsChatHistoryMessage[]) {
  const slugs = new Set<string>()
  for (const message of messages) {
    const metadata = parseSoulsMessageMetadata(message.metadata)
    if (metadata.attachedLore?.slug) {
      slugs.add(metadata.attachedLore.slug)
    }
  }
  return [...slugs]
}

async function buildLoreDiscussedBlock(projectId: string, slugs: string[]) {
  if (slugs.length === 0) {
    return ""
  }

  const supabase = await createClient()
  const { data: entries } = await supabase
    .from("lore_entries")
    .select("name, slug, entry_type, canon_status, summary, content")
    .eq("project_id", projectId)
    .in("slug", slugs)

  if (!entries?.length) {
    return ""
  }

  const lines = entries.map((entry) => {
    const contentSnippet = entry.content?.slice(0, 800) ?? ""
    return [
      `### ${entry.name} (${entry.entry_type}, ${entry.canon_status})`,
      `slug: ${entry.slug}`,
      entry.summary ? `summary: ${entry.summary}` : "",
      contentSnippet ? `content:\n${contentSnippet}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  })

  return ["## Lore discussed in this private chat", ...lines].join("\n\n")
}

export function selectRecentMessages(messages: SoulsChatHistoryMessage[]) {
  const conversational = messages.filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      message.status !== "working" &&
      (message.body.trim() || parseSoulsMessageMetadata(message.metadata).attachedLore)
  )

  return conversational.slice(-SOULS_RECENT_MESSAGE_LIMIT)
}

export function buildSoulsChatContextBlock(input: {
  memorySummary?: string | null
  loreDiscussedBlock: string
  recentMessages: SoulsChatHistoryMessage[]
}) {
  const transcript = input.recentMessages.map(formatMessageForTranscript).join("\n\n")

  return [
    input.memorySummary?.trim()
      ? `## Long-term memory (compacted earlier in this private chat)\n${input.memorySummary.trim()}`
      : "",
    input.loreDiscussedBlock,
    transcript ? `## Recent private chat\n${transcript}` : "",
  ]
    .filter(Boolean)
    .join("\n\n")
}

function findCompactionCutoffIndex(messages: SoulsChatHistoryMessage[]) {
  const conversational = messages.filter(
    (message) => message.role === "user" || message.role === "assistant"
  )

  if (conversational.length <= SOULS_RECENT_MESSAGE_LIMIT) {
    return -1
  }

  return conversational.length - SOULS_RECENT_MESSAGE_LIMIT - 1
}

function messagesToCompact(
  messages: SoulsChatHistoryMessage[],
  compactedThroughMessageId?: string | null
) {
  const conversational = messages.filter(
    (message) =>
      (message.role === "user" || message.role === "assistant") &&
      message.status !== "working"
  )

  const cutoffIndex = findCompactionCutoffIndex(messages)
  if (cutoffIndex < 0) {
    return []
  }

  let startIndex = 0
  if (compactedThroughMessageId) {
    const lastCompactedIndex = conversational.findIndex(
      (message) => message.id === compactedThroughMessageId
    )
    if (lastCompactedIndex >= 0) {
      startIndex = lastCompactedIndex + 1
    }
  }

  if (startIndex > cutoffIndex) {
    return []
  }

  return conversational.slice(startIndex, cutoffIndex + 1)
}

function shouldCompactConversation(messages: SoulsChatHistoryMessage[]) {
  const conversational = messages.filter(
    (message) => message.role === "user" || message.role === "assistant"
  )

  if (conversational.length < SOULS_COMPACT_MESSAGE_THRESHOLD) {
    return estimateTranscriptChars(conversational) >= SOULS_COMPACT_CHAR_THRESHOLD
  }

  return true
}

export async function maybeCompactSoulsConversation(input: {
  conversationId: string
  projectId: string
  apiKey: string
  model: string
  messages: SoulsChatHistoryMessage[]
  memorySummary?: string | null
  compactedThroughMessageId?: string | null
}) {
  const batch = messagesToCompact(input.messages, input.compactedThroughMessageId)
  if (batch.length === 0 || !shouldCompactConversation(input.messages)) {
    return input.memorySummary ?? null
  }

  const transcript = batch.map(formatMessageForTranscript).join("\n\n")
  const loreSlugs = collectAttachedLoreSlugs(batch)
  const loreBlock = await buildLoreDiscussedBlock(input.projectId, loreSlugs)

  const userPrompt = [
    input.memorySummary?.trim()
      ? `## Existing memory\n${input.memorySummary.trim()}`
      : "",
    loreBlock,
    `## Messages to compact (${batch.length} turns)\n${transcript}`,
    "",
    "Merge into one updated memory document.",
  ]
    .filter(Boolean)
    .join("\n\n")

  const summary = await chatWithOpenRouter({
    apiKey: input.apiKey,
    model: input.model,
    maxTokens: 1800,
    temperature: 0.2,
    messages: [
      { role: "system", content: COMPACTION_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  })

  const lastCompactedMessage = batch[batch.length - 1]
  const supabase = await createClient()

  await supabase
    .from("souls_private_conversations")
    .update({
      memory_summary: summary.trim(),
      compacted_through_message_id: lastCompactedMessage.id,
      compacted_at: new Date().toISOString(),
    })
    .eq("id", input.conversationId)

  return summary.trim()
}

export async function buildSoulsPrivateChatContext(input: {
  conversationId: string
  projectId: string
  excludeMessageId?: string
  apiKey: string
  model: string
}) {
  const { conversation, messages } = await loadSoulsChatHistory(
    input.conversationId,
    input.excludeMessageId
  )

  let memorySummary = conversation?.memory_summary ?? null

  memorySummary = await maybeCompactSoulsConversation({
    conversationId: input.conversationId,
    projectId: input.projectId,
    apiKey: input.apiKey,
    model: input.model,
    messages,
    memorySummary,
    compactedThroughMessageId: conversation?.compacted_through_message_id,
  })

  const recentMessages = selectRecentMessages(messages)
  const loreSlugs = collectAttachedLoreSlugs(messages)
  const loreDiscussedBlock = await buildLoreDiscussedBlock(input.projectId, loreSlugs)

  return buildSoulsChatContextBlock({
    memorySummary,
    loreDiscussedBlock,
    recentMessages,
  })
}
