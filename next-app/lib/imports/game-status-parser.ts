export type GameStatusCheckbox = {
  text: string
  state: "done" | "partial" | "open"
  line: string
}

export function parseGameStatusCheckboxes(markdown: string): GameStatusCheckbox[] {
  const items: GameStatusCheckbox[] = []

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim()
    const match = trimmed.match(/^- \[(x|X|~| )\]\s+(.+)$/)
    if (!match) {
      continue
    }

    const marker = match[1]
    const text = match[2].trim()
    const state = marker === "x" || marker === "X" ? "done" : marker === "~" ? "partial" : "open"

    items.push({ text, state, line: trimmed })
  }

  return items
}

function normalizeMatchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function textsLikelyMatch(left: string, right: string) {
  const a = normalizeMatchText(left)
  const b = normalizeMatchText(right)
  if (!a || !b) {
    return false
  }
  if (a === b) {
    return true
  }
  if (a.length > 8 && b.length > 8 && (a.includes(b) || b.includes(a))) {
    return true
  }

  const aWords = a.split(" ").filter((word) => word.length > 3)
  const bWords = new Set(b.split(" ").filter((word) => word.length > 3))
  const overlap = aWords.filter((word) => bWords.has(word)).length
  return overlap >= Math.min(3, Math.min(aWords.length, bWords.size))
}
