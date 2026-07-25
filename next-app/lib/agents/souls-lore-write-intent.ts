export function detectLoreWriteIntent(prompt: string) {
  const trimmed = prompt.trim()
  if (!trimmed) {
    return false
  }

  const lower = trimmed.toLowerCase()

  if (
    /\b(add|legg|put|place|create|insert|write|skriv|oppdater|update|kan du legge|can you add)\b/i.test(
      trimmed
    ) &&
    /\b(lore|canon|kanon|library|bibliotek)\b/i.test(trimmed)
  ) {
    return true
  }

  if (/\b(lag|legg|put|add).{0,48}\b(lore|kanon|canon)\b/i.test(lower)) {
    return true
  }

  const paragraphs = trimmed.split(/\n\s*\n/).filter((part) => part.trim().length > 40)
  if (paragraphs.length >= 2 && trimmed.length >= 150) {
    return true
  }

  if (
    trimmed.length >= 120 &&
    /\b(everwood|rekindl|settlement|region|faction|soulblight|hearth|corruption|builder|hut|carpenter)\b/i.test(
      trimmed
    )
  ) {
    return true
  }

  return false
}

export const SOULS_LORE_WRITE_ADDENDUM = `
**Lore write mode (ACTIVE)**
- The user pasted lore or asked you to add/update canon. You MUST persist it with tools — prose alone does not save anything.
- Respond with **valid JSON only** (no markdown outside the reply field). Include lore.upsert in actions[] on the first round.
- Typical flow: lore.list (optional once) → lore.upsert with sections[] → lore.relationship / lore.collection.add when appropriate.
- Set done: false until lore.upsert (or section upserts) succeed for every entry in the request.
- Never use ✓ checkmarks or "Actions taken" in reply unless the server executed those tools successfully.
- Split long pasted text into the right entryType, parentSlug, and sections[] (overview, history, purpose, etc.).
`

export function buildLoreWritePromptBlock() {
  return [
    "## Lore write required",
    "Return JSON with actions[] containing at least one lore.upsert (use sections[] for the pasted text).",
    "Do not answer in plain markdown only. Set done: false until tools succeed.",
  ].join("\n")
}
