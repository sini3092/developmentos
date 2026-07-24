export type GameStatusCheckbox = {
  text: string
  state: "done" | "partial" | "open"
  line: string
}

export type GameStatusSection = {
  title: string
  statusLine?: string
  comments: string[]
  checkboxes: GameStatusCheckbox[]
}

export type GameStatusDocument = {
  sections: GameStatusSection[]
  orphanCheckboxes: GameStatusCheckbox[]
}

const CHECKBOX_RE = /^- \[(x|X|~| )\]\s+(.+)$/
const HEADING_RE = /^#{2,3}\s+(.+)$/
const BLOCKQUOTE_RE = /^>\s+(.+)$/
const STATUS_RE = /^\*\*status:\*\*\s*(.+)$/i
const COMMENT_DIRECTIVE_RE = /^!comment\s+(.+)$/i
const HTML_COMMENT_RE = /^<!--\s*@comment:\s*(.+?)\s*-->$/i

function parseCheckboxLine(trimmed: string): GameStatusCheckbox | null {
  const match = trimmed.match(CHECKBOX_RE)
  if (!match) {
    return null
  }

  const marker = match[1]
  const text = match[2].trim()
  const state = marker === "x" || marker === "X" ? "done" : marker === "~" ? "partial" : "open"

  return { text, state, line: trimmed }
}

export function parseGameStatusCheckboxes(markdown: string): GameStatusCheckbox[] {
  const items: GameStatusCheckbox[] = []

  for (const line of markdown.split("\n")) {
    const checkbox = parseCheckboxLine(line.trim())
    if (checkbox) {
      items.push(checkbox)
    }
  }

  return items
}

export function parseGameStatusDocument(markdown: string): GameStatusDocument {
  const sections: GameStatusSection[] = []
  const orphanCheckboxes: GameStatusCheckbox[] = []
  let current: GameStatusSection | null = null

  for (const rawLine of markdown.split("\n")) {
    const trimmed = rawLine.trim()
    if (!trimmed) {
      continue
    }

    const headingMatch = trimmed.match(HEADING_RE)
    if (headingMatch) {
      current = {
        title: headingMatch[1].trim(),
        comments: [],
        checkboxes: [],
      }
      sections.push(current)
      continue
    }

    const statusMatch = trimmed.match(STATUS_RE)
    if (statusMatch && current) {
      current.statusLine = statusMatch[1].trim()
      continue
    }

    const blockquoteMatch = trimmed.match(BLOCKQUOTE_RE)
    if (blockquoteMatch) {
      const text = blockquoteMatch[1].trim()
      if (current) {
        current.comments.push(text)
      }
      continue
    }

    const directiveMatch = trimmed.match(COMMENT_DIRECTIVE_RE)
    if (directiveMatch) {
      if (current) {
        current.comments.push(directiveMatch[1].trim())
      }
      continue
    }

    const htmlCommentMatch = trimmed.match(HTML_COMMENT_RE)
    if (htmlCommentMatch) {
      if (current) {
        current.comments.push(htmlCommentMatch[1].trim())
      }
      continue
    }

    const checkbox = parseCheckboxLine(trimmed)
    if (checkbox) {
      if (current) {
        current.checkboxes.push(checkbox)
      } else {
        orphanCheckboxes.push(checkbox)
      }
    }
  }

  return { sections, orphanCheckboxes }
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
