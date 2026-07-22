import type { LoreEntryType } from "@/lib/database.types"

export type LoreSectionTemplate = {
  key: string
  title: string
  placeholder?: string
}

const DEFAULT_SECTIONS: LoreSectionTemplate[] = [
  { key: "overview", title: "Overview", placeholder: "What is this entry about?" },
  { key: "details", title: "Details", placeholder: "Core facts, traits, or mechanics." },
  { key: "history", title: "History", placeholder: "Backstory or timeline context." },
  { key: "notes", title: "Development Notes", placeholder: "Open questions and draft ideas." },
]

export const LORE_SECTION_TEMPLATES: Record<LoreEntryType, LoreSectionTemplate[]> = {
  character: [
    { key: "overview", title: "Overview", placeholder: "Who is this character?" },
    { key: "appearance", title: "Appearance" },
    { key: "personality", title: "Personality & Motivations" },
    { key: "history", title: "History" },
    { key: "relationships", title: "Relationships" },
    { key: "notes", title: "Development Notes" },
  ],
  faction: [
    { key: "overview", title: "Overview" },
    { key: "structure", title: "Structure & Leadership" },
    { key: "goals", title: "Goals & Motivations" },
    { key: "territory", title: "Territory & Influence" },
    { key: "history", title: "History" },
    { key: "notes", title: "Development Notes" },
  ],
  location: [
    { key: "overview", title: "Overview" },
    { key: "geography", title: "Geography & Layout" },
    { key: "inhabitants", title: "Inhabitants" },
    { key: "history", title: "History" },
    { key: "notes", title: "Development Notes" },
  ],
  region: [
    { key: "overview", title: "Overview" },
    { key: "geography", title: "Geography" },
    { key: "settlements", title: "Settlements & Landmarks" },
    { key: "politics", title: "Politics & Factions" },
    { key: "history", title: "History" },
    { key: "notes", title: "Development Notes" },
  ],
  settlement: [
    { key: "overview", title: "Overview" },
    { key: "layout", title: "Layout & Districts" },
    { key: "population", title: "Population & Culture" },
    { key: "economy", title: "Economy & Trade" },
    { key: "history", title: "History" },
    { key: "notes", title: "Development Notes" },
  ],
  creature: [
    { key: "overview", title: "Overview" },
    { key: "behavior", title: "Behavior" },
    { key: "habitat", title: "Habitat" },
    { key: "encounters", title: "Encounters & Gameplay" },
    { key: "notes", title: "Development Notes" },
  ],
  enemy: [
    { key: "overview", title: "Overview" },
    { key: "combat", title: "Combat Profile" },
    { key: "behavior", title: "Behavior & AI" },
    { key: "loot", title: "Loot & Rewards" },
    { key: "notes", title: "Development Notes" },
  ],
  deity: [
    { key: "overview", title: "Overview" },
    { key: "domains", title: "Domains & Symbols" },
    { key: "worship", title: "Worship & Followers" },
    { key: "mythology", title: "Mythology" },
    { key: "notes", title: "Development Notes" },
  ],
  historical_event: [
    { key: "overview", title: "Overview" },
    { key: "timeline", title: "Timeline" },
    { key: "participants", title: "Key Participants" },
    { key: "consequences", title: "Consequences" },
    { key: "notes", title: "Development Notes" },
  ],
  culture: [
    { key: "overview", title: "Overview" },
    { key: "values", title: "Values & Customs" },
    { key: "daily_life", title: "Daily Life" },
    { key: "history", title: "History" },
    { key: "notes", title: "Development Notes" },
  ],
  religion: [
    { key: "overview", title: "Overview" },
    { key: "beliefs", title: "Beliefs & Tenets" },
    { key: "practices", title: "Practices & Rituals" },
    { key: "institutions", title: "Institutions" },
    { key: "notes", title: "Development Notes" },
  ],
  item: [
    { key: "overview", title: "Overview" },
    { key: "properties", title: "Properties" },
    { key: "usage", title: "Usage & Acquisition" },
    { key: "lore", title: "In-World Lore" },
    { key: "notes", title: "Development Notes" },
  ],
  weapon: [
    { key: "overview", title: "Overview" },
    { key: "stats", title: "Combat Stats" },
    { key: "crafting", title: "Crafting & Upgrades" },
    { key: "lore", title: "In-World Lore" },
    { key: "notes", title: "Development Notes" },
  ],
  artifact: [
    { key: "overview", title: "Overview" },
    { key: "powers", title: "Powers & Effects" },
    { key: "origin", title: "Origin" },
    { key: "legends", title: "Legends" },
    { key: "notes", title: "Development Notes" },
  ],
  resource: [
    { key: "overview", title: "Overview" },
    { key: "properties", title: "Properties" },
    { key: "sources", title: "Sources & Harvesting" },
    { key: "uses", title: "Uses" },
    { key: "notes", title: "Development Notes" },
  ],
  quest: [
    { key: "overview", title: "Overview" },
    { key: "objectives", title: "Objectives" },
    { key: "npcs", title: "Key NPCs" },
    { key: "branches", title: "Branches & Outcomes" },
    { key: "notes", title: "Development Notes" },
  ],
  story_arc: [
    { key: "overview", title: "Overview" },
    { key: "acts", title: "Acts & Beats" },
    { key: "characters", title: "Characters" },
    { key: "themes", title: "Themes" },
    { key: "notes", title: "Development Notes" },
  ],
  dialogue: [
    { key: "overview", title: "Overview" },
    { key: "context", title: "Context" },
    { key: "script", title: "Dialogue Script" },
    { key: "variants", title: "Variants" },
    { key: "notes", title: "Development Notes" },
  ],
  book_or_note: [
    { key: "overview", title: "Overview" },
    { key: "contents", title: "Contents" },
    { key: "discovery", title: "Discovery & Placement" },
    { key: "notes", title: "Development Notes" },
  ],
  magic_system: [
    { key: "overview", title: "Overview" },
    { key: "rules", title: "Rules & Limits" },
    { key: "schools", title: "Schools & Traditions" },
    { key: "costs", title: "Costs & Risks" },
    { key: "notes", title: "Development Notes" },
  ],
  language: [
    { key: "overview", title: "Overview" },
    { key: "phonology", title: "Phonology & Writing" },
    { key: "vocabulary", title: "Vocabulary Samples" },
    { key: "usage", title: "Usage in the World" },
    { key: "notes", title: "Development Notes" },
  ],
  timeline_event: [
    { key: "overview", title: "Overview" },
    { key: "date", title: "Date & Era" },
    { key: "participants", title: "Participants" },
    { key: "impact", title: "Impact" },
    { key: "notes", title: "Development Notes" },
  ],
  other: DEFAULT_SECTIONS,
}

export function getLoreSectionTemplates(entryType: LoreEntryType): LoreSectionTemplate[] {
  return LORE_SECTION_TEMPLATES[entryType] ?? DEFAULT_SECTIONS
}
