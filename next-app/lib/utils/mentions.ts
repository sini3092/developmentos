export const AGENT_MENTION_ALIASES = {
  souls: ["souls", "soul"],
  personal: ["personal", "codex"],
} as const

export type AgentName = keyof typeof AGENT_MENTION_ALIASES

const MENTION_PATTERN = /@([A-Za-z0-9][A-Za-z0-9_.-]{0,39})/g

export function parseMentionNames(body: string) {
  const names = new Set<string>()
  for (const match of body.matchAll(MENTION_PATTERN)) {
    const name = match[1]?.trim()
    if (name) {
      names.add(name)
    }
  }
  return [...names]
}

export function parseAgentMentions(body: string): AgentName[] {
  const names = parseMentionNames(body).map((name) => name.toLowerCase())
  const agents = new Set<AgentName>()

  for (const name of names) {
    if ((AGENT_MENTION_ALIASES.souls as readonly string[]).includes(name)) {
      agents.add("souls")
    }
    if ((AGENT_MENTION_ALIASES.personal as readonly string[]).includes(name)) {
      agents.add("personal")
    }
  }

  return [...agents]
}

export function resolveMentionedUserIds(
  body: string,
  members: Array<{ profile: { id: string; display_name: string | null } | null }>
) {
  const names = parseMentionNames(body)
  const userIds = new Set<string>()
  const agentAliases = new Set<string>([
    ...AGENT_MENTION_ALIASES.souls,
    ...AGENT_MENTION_ALIASES.personal,
  ])

  for (const mention of names) {
    const normalized = mention.toLowerCase()
    if (agentAliases.has(normalized)) {
      continue
    }

    const member = members.find((entry) => {
      const displayName = entry.profile?.display_name?.toLowerCase()
      if (!displayName) {
        return false
      }
      return (
        displayName === normalized ||
        displayName.replace(/\s+/g, "") === normalized.replace(/\s+/g, "")
      )
    })

    if (member?.profile?.id) {
      userIds.add(member.profile.id)
    }
  }

  return [...userIds]
}

export function renderMessageBody(body: string) {
  const parts: Array<{ type: "text" | "mention"; value: string }> = []
  let lastIndex = 0

  for (const match of body.matchAll(MENTION_PATTERN)) {
    const index = match.index ?? 0
    if (index > lastIndex) {
      parts.push({ type: "text", value: body.slice(lastIndex, index) })
    }
    parts.push({ type: "mention", value: match[0] })
    lastIndex = index + match[0].length
  }

  if (lastIndex < body.length) {
    parts.push({ type: "text", value: body.slice(lastIndex) })
  }

  return parts.length > 0 ? parts : [{ type: "text" as const, value: body }]
}

export const QUICK_REACTIONS = ["👍", "❤️", "😂", "🎉", "👀", "✅"] as const
