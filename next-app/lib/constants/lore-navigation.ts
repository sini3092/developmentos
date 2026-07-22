import type { CanonStatus, LoreEntryType } from "@/lib/database.types"
import { LORE_ENTRY_TYPE_LABELS } from "@/lib/constants/knowledge"

export type LoreCategoryCard = {
  id: string
  label: string
  description: string
  href: string
  types: LoreEntryType[]
  tone: "blue" | "red" | "green" | "amber" | "orange" | "purple" | "cyan" | "pink"
}

export const LORE_CATEGORY_CARDS: LoreCategoryCard[] = [
  {
    id: "world",
    label: "World & Geography",
    description: "Regions, settlements, and places in the world.",
    href: "world",
    types: ["region", "location", "settlement"],
    tone: "green",
  },
  {
    id: "characters",
    label: "Characters",
    description: "People, companions, and historical figures.",
    href: "characters",
    types: ["character"],
    tone: "blue",
  },
  {
    id: "factions",
    label: "Factions",
    description: "Kingdoms, orders, cults, and hostile groups.",
    href: "factions",
    types: ["faction"],
    tone: "red",
  },
  {
    id: "history",
    label: "History",
    description: "Wars, eras, and turning points.",
    href: "history",
    types: ["historical_event", "timeline_event"],
    tone: "amber",
  },
  {
    id: "creatures",
    label: "Creatures",
    description: "Wildlife, monsters, and legendary beasts.",
    href: "creatures",
    types: ["creature", "enemy"],
    tone: "orange",
  },
  {
    id: "culture",
    label: "Cultures & Religion",
    description: "Beliefs, deities, and ways of life.",
    href: "culture",
    types: ["culture", "religion", "deity", "language"],
    tone: "purple",
  },
  {
    id: "items",
    label: "Items & Artifacts",
    description: "Weapons, tools, resources, and relics.",
    href: "items",
    types: ["item", "weapon", "artifact", "resource"],
    tone: "cyan",
  },
  {
    id: "stories",
    label: "Quests & Stories",
    description: "Arcs, quests, magic, and in-world texts.",
    href: "stories",
    types: ["quest", "story_arc", "dialogue", "book_or_note", "magic_system"],
    tone: "pink",
  },
]

export const LORE_CATEGORY_BY_HREF = Object.fromEntries(
  LORE_CATEGORY_CARDS.map((category) => [category.href, category])
) as Record<string, LoreCategoryCard>

export const LORE_TYPE_TONE: Partial<Record<LoreEntryType, LoreCategoryCard["tone"]>> = {}
for (const category of LORE_CATEGORY_CARDS) {
  for (const type of category.types) {
    LORE_TYPE_TONE[type] = category.tone
  }
}

export const LORE_SIDEBAR_LINKS = [
  { title: "Lore Home", href: "" },
  { title: "Browse", href: "browse" },
  { title: "Search", href: "search" },
  { title: "Timeline", href: "timeline" },
  { title: "Collections", href: "collections" },
  { title: "World", href: "world" },
  { title: "Map", href: "map" },
  { title: "Health", href: "health" },
  { title: "Drafts", href: "drafts" },
  { title: "Review Queue", href: "review" },
  { title: "Archived", href: "archived" },
  { title: "Graph", href: "graph" },
] as const

export const ACTIVE_CANON_STATUSES: CanonStatus[] = [
  "concept",
  "draft",
  "review",
  "canon",
  "retconned",
]

export function loreTypeLabel(type: LoreEntryType) {
  return LORE_ENTRY_TYPE_LABELS[type]
}
