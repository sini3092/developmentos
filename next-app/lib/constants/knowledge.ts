import type { CanonStatus, DocumentStatus, LoreEntryType } from "@/lib/database.types"

export const DOCUMENT_STATUSES: DocumentStatus[] = [
  "draft",
  "in_review",
  "approved",
  "deprecated",
  "archived",
]

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  deprecated: "Deprecated",
  archived: "Archived",
}

export const DESIGN_CATEGORIES = [
  { id: "game_vision", label: "Game Vision" },
  { id: "core_pillars", label: "Core Pillars" },
  { id: "player_experience", label: "Player Experience" },
  { id: "gameplay_loops", label: "Gameplay Loops" },
  { id: "progression", label: "Progression" },
  { id: "combat", label: "Combat" },
  { id: "survival_systems", label: "Survival Systems" },
  { id: "crafting", label: "Crafting" },
  { id: "building", label: "Building" },
  { id: "world_systems", label: "World Systems" },
  { id: "ui_ux", label: "UI/UX" },
  { id: "technical_design", label: "Technical Design" },
] as const

export const LORE_ENTRY_TYPES: LoreEntryType[] = [
  "character",
  "faction",
  "location",
  "region",
  "settlement",
  "creature",
  "enemy",
  "deity",
  "historical_event",
  "culture",
  "religion",
  "item",
  "weapon",
  "artifact",
  "resource",
  "quest",
  "story_arc",
  "dialogue",
  "book_or_note",
  "magic_system",
  "language",
  "timeline_event",
  "other",
]

export const LORE_ENTRY_TYPE_LABELS: Record<LoreEntryType, string> = {
  character: "Character",
  faction: "Faction",
  location: "Location",
  region: "Region",
  settlement: "Settlement",
  creature: "Creature",
  enemy: "Enemy",
  deity: "Deity",
  historical_event: "Historical Event",
  culture: "Culture",
  religion: "Religion",
  item: "Item",
  weapon: "Weapon",
  artifact: "Artifact",
  resource: "Resource",
  quest: "Quest",
  story_arc: "Story Arc",
  dialogue: "Dialogue",
  book_or_note: "Book or Note",
  magic_system: "Magic System",
  language: "Language",
  timeline_event: "Timeline Event",
  other: "Other",
}

export const CANON_STATUSES: CanonStatus[] = [
  "concept",
  "draft",
  "review",
  "canon",
  "retconned",
  "archived",
]

export const CANON_STATUS_LABELS: Record<CanonStatus, string> = {
  concept: "Concept",
  draft: "Draft",
  review: "Review",
  canon: "Canon",
  retconned: "Retconned",
  archived: "Archived",
}
