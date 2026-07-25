export type GameStatusCheckbox = {
  text: string
  state: "done" | "partial" | "open"
  line: string
}

export type GameStatusSection = {
  title: string
  category: string | null
  statusLine?: string
  comments: string[]
  checkboxes: GameStatusCheckbox[]
  syncable: boolean
}

export type GameStatusDocument = {
  sections: GameStatusSection[]
  orphanCheckboxes: GameStatusCheckbox[]
}

const CHECKBOX_RE = /^- \[(x|X|~| )\]\s+(.+)$/
const FEATURE_HEADING_RE = /^##\s+(.+)$/
const CATEGORY_HEADING_RE = /^#\s+(.+)$/
const BLOCKQUOTE_RE = /^>\s+(.+)$/
const STATUS_RE = /^\*\*status:\*\*\s*(.+)$/i
const COMMENT_DIRECTIVE_RE = /^!comment\s+(.+)$/i
const HTML_COMMENT_RE = /^<!--\s*@comment:\s*(.+?)\s*-->$/i

const META_SECTION_PATTERNS = [
  /^how this file is organized/i,
  /^how to extend/i,
  /^checkbox syntax/i,
  /^currently in progress/i,
  /^planned next/i,
  /^milestone\b/i,
  /^validation$/i,
  /^item reference/i,
  /^key files/i,
  /^design documents/i,
  /^commit history/i,
  /^open decisions/i,
]

const NON_SYNC_CATEGORY_PATTERNS = [/appendix/i, /session log/i, /^game status/i]

const BOARD_SYSTEM_CATEGORIES = new Set(
  [
    "Core Player",
    "World & Environment",
    "Gathering & Resources",
    "Inventory & Crafting",
    "Building & Settlement",
    "Rekindled & NPCs",
    "Combat & Progression",
    "Quests & Narrative",
    "UI, HUD & Menus",
    "Audio",
    "Save, Tools & Technical",
    "Animals & Farming",
  ].map((name) => name.toLowerCase())
)

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

function isMetaSectionTitle(title: string) {
  return META_SECTION_PATTERNS.some((pattern) => pattern.test(title.trim()))
}

function isNonSyncCategory(category: string | null) {
  if (!category) {
    return false
  }
  return NON_SYNC_CATEGORY_PATTERNS.some((pattern) => pattern.test(category.trim()))
}

function isBoardSystemCategory(category: string | null) {
  if (!category) {
    return false
  }
  return BOARD_SYSTEM_CATEGORIES.has(category.trim().toLowerCase())
}

export function isGameStatusMetaSection(title: string) {
  return isMetaSectionTitle(title)
}

export function isGameStatusSystemCategory(category: string | null) {
  return isBoardSystemCategory(category)
}

export function resolveGameStatusSectionSyncable(section: {
  title: string
  category: string | null
  statusLine?: string
}) {
  if (!section.statusLine?.trim()) {
    return false
  }
  if (isMetaSectionTitle(section.title)) {
    return false
  }
  if (isNonSyncCategory(section.category)) {
    return false
  }
  return true
}

export function parseGameStatusCheckboxes(markdown: string): GameStatusCheckbox[] {
  const items: GameStatusCheckbox[] = []
  let inCodeFence = false

  for (const line of markdown.split("\n")) {
    const trimmed = line.trim()
    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence
      continue
    }
    if (inCodeFence) {
      continue
    }

    const checkbox = parseCheckboxLine(trimmed)
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
  let currentCategory: string | null = null
  let inCodeFence = false

  for (const rawLine of markdown.split("\n")) {
    const trimmed = rawLine.trim()
    if (!trimmed) {
      continue
    }

    if (trimmed.startsWith("```")) {
      inCodeFence = !inCodeFence
      continue
    }
    if (inCodeFence) {
      continue
    }

    const categoryMatch = trimmed.match(CATEGORY_HEADING_RE)
    if (categoryMatch && !trimmed.startsWith("##")) {
      const name = categoryMatch[1].trim()
      if (!/^game status/i.test(name)) {
        currentCategory = name
      }
      continue
    }

    const headingMatch = trimmed.match(FEATURE_HEADING_RE)
    if (headingMatch) {
      current = {
        title: headingMatch[1].trim(),
        category: currentCategory,
        comments: [],
        checkboxes: [],
        syncable: false,
      }
      sections.push(current)
      continue
    }

    const statusMatch = trimmed.match(STATUS_RE)
    if (statusMatch && current) {
      current.statusLine = statusMatch[1].trim()
      current.syncable = resolveGameStatusSectionSyncable(current)
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

  for (const section of sections) {
    if (!section.statusLine) {
      section.syncable = false
      continue
    }
    section.syncable = resolveGameStatusSectionSyncable(section)
    if (!section.syncable && isBoardSystemCategory(section.category)) {
      section.syncable = true
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

  const aWords = a.split(" ").filter((word) => word.length > 2)
  const bWords = new Set(b.split(" ").filter((word) => word.length > 2))
  if (aWords.length === 0 || bWords.size === 0) {
    return false
  }

  const overlap = aWords.filter((word) => bWords.has(word)).length
  if (overlap === 0) {
    return false
  }

  // Avoid matching a short generic title ("Inventory") to every checkbox mentioning inventory.
  const threshold = Math.min(2, Math.min(aWords.length, bWords.size))
  if (threshold < 2) {
    return false
  }

  return overlap >= threshold
}

export function getSyncableSections(document: GameStatusDocument) {
  return document.sections.filter((section) => section.syncable)
}
