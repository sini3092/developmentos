export type SoulsAgentResponse = {
  reply: string
  done?: boolean
  actions?: Array<{ tool: string; label: string; input: Record<string, unknown> }>
}

export function parseSoulsAgentResponse(
  raw: string,
  options?: { requireToolActions?: boolean }
): SoulsAgentResponse {
  const trimmed = raw.trim()
  const requireToolActions = options?.requireToolActions === true
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)

  if (!jsonMatch) {
    return {
      reply: trimmed,
      done: requireToolActions ? false : true,
      actions: [],
    }
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as SoulsAgentResponse
    const actions = parsed.actions ?? []
    const done =
      requireToolActions && actions.length === 0
        ? false
        : (parsed.done ?? (requireToolActions ? false : true))

    return {
      reply: parsed.reply?.trim() || trimmed,
      done,
      actions,
    }
  } catch {
    return {
      reply: trimmed,
      done: requireToolActions ? false : true,
      actions: [],
    }
  }
}

export function formatSoulsLoreActionSummary(
  results: Array<{ tool: string; status: string; summary?: string; label: string }>
) {
  const loreResults = results.filter((result) => result.tool.startsWith("lore."))
  if (loreResults.length === 0) {
    return null
  }

  return loreResults
    .map((result) => {
      const mark = result.status === "success" ? "✓" : "✗"
      return `- ${mark} ${result.summary ?? result.label}`
    })
    .join("\n")
}
