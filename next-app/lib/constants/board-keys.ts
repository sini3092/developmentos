export const BOARD_KEYS = {
  dev: "Game Development",
  systems: "Game Systems",
  roadmap: "Roadmap",
  bugs: "Bugs & Polish",
  lore: "Lore & Narrative",
} as const

export type BoardKey = keyof typeof BOARD_KEYS

export const BOARD_KEY_ORDER: BoardKey[] = ["dev", "systems", "roadmap", "bugs", "lore"]

export const EVERWOOD_BOARD_LISTS: Record<BoardKey, string[]> = {
  dev: ["Inbox", "Planned", "Ready", "In Progress", "Needs Testing", "Blocked", "Done", "Deferred"],
  systems: [
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
  ],
  roadmap: [
    "Prototype Stabilization",
    "Core Survival Loop",
    "Settlement Foundation",
    "Combat Foundation",
    "World Atmosphere",
    "Content Expansion",
    "Vertical Slice",
    "Later / Post-Prototype",
  ],
  bugs: ["New", "Confirmed", "In Progress", "Needs Retest", "Fixed", "Won't Fix / Deferred"],
  lore: [
    "World Rules",
    "Regions",
    "Characters",
    "Factions",
    "History",
    "Creatures",
    "Items & Artifacts",
    "Quests & Story",
    "Needs Review",
    "Canon",
  ],
}
