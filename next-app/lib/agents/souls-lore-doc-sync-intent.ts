export type LoreDocSyncIntent = {
  loreOnly: boolean
  immediate: boolean
  reason: string
}

const FULL_DOCS_HINT =
  /\b(game[_\s-]?status|begge|everything|full\s+docs?|loredoc\s*\+\s*game)/i

function normalizeIntentText(message: string) {
  return message.trim().toLowerCase().replace(/\s+/g, " ")
}

const STRONG_LORE_SYNC_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(sync|synk)(?:h)?\s+lore(?:doc|dokument)?\b/i, reason: "sync lore" },
  { pattern: /\b(sync|synk)(?:h)?\s+(?:med\s+)?dokument(?:et)?\b/i, reason: "sync document" },
  { pattern: /\b(sync|synk)\s+med\s+loredoc\b/i, reason: "sync loredoc" },
  { pattern: /\b(sync|synk)\s+(?:det\s+)?(?:som\s+er\s+)?(?:i\s+)?loren?\b/i, reason: "sync what's in lore" },
  { pattern: /\b(export|push)\s+lore\b/i, reason: "export lore" },
  { pattern: /\bop(?:p)?dater\s+loredoc\b/i, reason: "update loredoc" },
  { pattern: /\blore\s+til\s+(?:git|github|loredoc|dokument)/i, reason: "lore to document" },
  { pattern: /\bvi\s+har\s+(?:endret|lagt\s+inn|oppdatert)\s+lore\b/i, reason: "we changed lore" },
  { pattern: /\b(?:lagt|skrevet)\s+inn\s+lore\b/i, reason: "added lore" },
  { pattern: /\bsync\s+lore\s+(?:til|to)\s+(?:dokument|doc|git|github)/i, reason: "sync lore to doc" },
  { pattern: /\bdocs?\.sync\b/i, reason: "docs.sync" },
  { pattern: /\bsync\s+(?:lore\s+)?(?:med|to|til)\s+dokument/i, reason: "sync to document" },
]

const SOFT_LORE_SYNC_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\b(sync|synk)\b.*\b(lore|loren|loredoc|dokument)/i, reason: "sync + lore keyword" },
  { pattern: /\b(lore|loren|loredoc)\b.*\b(sync|synk|export|push|dokument)/i, reason: "lore + sync keyword" },
]

function isExplainOnlyQuestion(message: string) {
  const normalized = normalizeIntentText(message)
  return (
    /^(how|what|when|why|hva|hvordan|når|hvorfor)\b/.test(normalized) &&
    !/\b(kan du|please|gjør|do it|kjør|run|sync|synk)\b/i.test(normalized)
  )
}

export function detectLoreDocSyncIntent(message: string): LoreDocSyncIntent | null {
  const trimmed = message.trim()
  if (!trimmed || trimmed.length > 400 || isExplainOnlyQuestion(trimmed)) {
    return null
  }

  for (const entry of STRONG_LORE_SYNC_PATTERNS) {
    if (entry.pattern.test(trimmed)) {
      return {
        loreOnly: !FULL_DOCS_HINT.test(trimmed),
        immediate: trimmed.length <= 140,
        reason: entry.reason,
      }
    }
  }

  for (const entry of SOFT_LORE_SYNC_PATTERNS) {
    if (entry.pattern.test(trimmed)) {
      return {
        loreOnly: !FULL_DOCS_HINT.test(trimmed),
        immediate: trimmed.length <= 80,
        reason: entry.reason,
      }
    }
  }

  return null
}

export function buildLoreDocSyncIntentHint(message: string) {
  const intent = detectLoreDocSyncIntent(message)
  if (!intent) {
    return null
  }

  const scope = intent.loreOnly
    ? "loreOnly: true — export DevelopmentOS lore to docs/loredoc.md only (no GAME_STATUS gap-fill unless they asked for both)"
    : "full docs.sync — lore export plus GAME_STATUS gap-fill if needed"

  return [
    "## Detected user intent: sync lore to GitHub loredoc.md",
    `Matched: ${intent.reason}.`,
    `Run docs.sync now with ${scope}.`,
    "Typical after lore.upsert rounds or when they say lore changed in the app.",
    "Reply briefly in the user's language with what was synced.",
  ].join("\n")
}
