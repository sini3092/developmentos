import type { TaskPriority } from "@/lib/database.types"
import type { BoardKey } from "@/lib/constants/board-keys"

export type PlanTaskCard = {
  title: string
  boardKey: BoardKey
  listName: string
  priority?: TaskPriority
  status?: "backlog" | "in_progress" | "in_review" | "done" | "cancelled"
  milestone?: string
  system?: string
  description?: string
  acceptanceCriteria?: string
  checklist?: string[]
  featureState?: "Playable" | "Partial" | "Data Only" | "Design Only" | "Needs Polish" | "Needs Test" | "Blocked"
}

export type PlanMilestone = {
  name: string
  slug: string
  description: string
  checklist: string[]
  exitCriteria: string
  horizonList: string
}

export type PlanDecision = {
  title: string
  slug: string
  context: string
  problem: string
  options?: string
}

export type PlanDesignDoc = {
  title: string
  category: string
  status: "draft" | "in_review" | "approved" | "deprecated" | "archived"
  summary: string
}

export type PlanLoreEntry = {
  name: string
  slug: string
  entryType: string
  collection?: string
  summary?: string
}

export const EVERWOOD_PLAYABLE_SYSTEMS = [
  "Procedural Terrain3D world",
  "Island world with ocean and lakes",
  "Water shader and shallow-water wading",
  "Shoreline spawn",
  "Loading screen and threaded launch flow",
  "Player movement, sprint, jump and landing",
  "Day/night cycle",
  "Wind manager",
  "Grass streaming around the player",
  "World population system",
  "Tree chopping and log collection",
  "Stone and Soulstone mining",
  "Berry and fiber gathering",
  "Ground item drops and pickup",
  "Wild chicken AI and loot",
  "Inventory",
  "Quickbar",
  "Equipment slots",
  "Crafting queue and knowledge nodes",
  "Campfire building and campfire crafting",
  "Settlement Hearth placement and construction",
  "Rekindled body generation and ritual",
  "Basic Rekindled follow/wander/settlement behavior",
  "Player progression phase 1",
  "Food, water, warmth and encumbrance",
  "Skill tree UI",
  "Initial campfire quest",
  "Main menu, settings, save slots and pause menu",
  "Save/load of player and world state",
  "Basic gameplay HUD",
  "Initial audio manager and connected harvest sounds",
] as const

export const EVERWOOD_SYSTEMS_BOARD: Record<string, { completed: string[]; partial: string[] }> = {
  "Core Player": {
    completed: [
      "Third-Person Movement",
      "Sprint and Stamina Consumption",
      "Jump and Landing",
      "Camera System",
      "Tool Use — Axe",
      "Tool Use — Pickaxe",
      "Sit Interaction",
      "Inventory Weight Movement Effects",
      "Player Save and Load",
    ],
    partial: [
      "Swimming",
      "Bow Aiming and Shooting",
      "Combat Dodge or Block Decision",
      "Player Damage Reactions",
      "Status Effects",
      "Shelter Detection",
    ],
  },
  "World & Environment": {
    completed: [
      "Procedural Terrain3D World",
      "Island, Ocean and Lakes",
      "Water Shader",
      "Shallow-Water Wading",
      "Shoreline Spawn",
      "World Loading Flow",
      "Grass Streaming",
      "Day and Night Cycle",
      "Wind Manager",
      "World Population",
      "Berry Bush Streaming and Regrowth",
    ],
    partial: [
      "Physical Sky",
      "WeatherManager",
      "Cloud System",
      "Rain",
      "Snow",
      "Forest Mist",
      "Wetness",
      "Indoor Weather Exclusion",
      "Weather Quality Levels",
      "Biome Definitions",
      "Biome-Specific Population Rules",
      "Region Discovery",
      "Map and Fog of War",
      "Deep-Water Gameplay",
      "Emberstone Deposits",
    ],
  },
  "Gathering & Resources": {
    completed: [
      "Tree Chopping",
      "Log Pickups",
      "Stone Mining",
      "Soulstone Mining",
      "Berry Gathering",
      "Fiber Gathering",
      "Ground Item Pickups",
      "Chicken Hunting",
    ],
    partial: [
      "Hearthleaf Gathering",
      "Emberstone Mining",
      "Fishing",
      "Farming",
      "Resource Quality or Rarity Decision",
      "Tool Tier Efficiency",
      "Resource Respawn Balancing",
    ],
  },
  "Inventory & Crafting": {
    completed: [
      "42-Slot Inventory",
      "12-Slot Quickbar",
      "Drag and Drop",
      "Stack Splitting",
      "Context Menu",
      "Equipment Panel",
      "Item Tooltips",
      "Durability Display",
      "Water Bottle Fill Display",
      "Crafting Queue",
      "Knowledge Nodes",
      "Campfire Station Recipes",
      "Blueprint Research Data",
      "Crafting XP",
    ],
    partial: [
      "Crafted Consumable Use Effects",
      "Stone Pickaxe Tool Registration",
      "Workbench Station",
      "Blueprint World Drops",
      "Equipment Stat Bonuses",
      "Backpack Capacity Bonus",
      "Torch Gameplay",
      "Soul Lantern Gameplay",
      "Crafting Recipe Balance Pass",
      "Item Rarity Resources",
      "Weapon and Armor Data Resources",
      "Set Bonuses",
      "Inventory Tooltip Final Polish",
    ],
  },
  "Building & Settlement": {
    completed: [
      "Placeable Preview",
      "Placement Validation",
      "Construction Site",
      "Material Delivery",
      "Construction Completion",
      "Campfire",
      "Settlement Hearth",
      "Settlement Boundary",
      "Settlement Membership",
      "Building Persistence",
    ],
    partial: [
      "Wooden Storage Box",
      "Workbench Tier I",
      "Improved Workbench",
      "Settlement Radius Upgrade UI",
      "Settlement Management Screen",
      "Resident Role Assignment",
      "Settlement Resource Overview",
      "Resident Needs",
      "Production Buildings",
      "Builder's Hut Decision",
      "Chicken Coop",
      "Building Upgrade Framework",
      "Building Demolition or Relocation",
      "Settlement Attack Framework",
    ],
  },
  "Rekindled & NPCs": {
    completed: [
      "Rekindled Body Spawning",
      "Inspect Remains",
      "Rekindling Ritual",
      "Deterministic Identity Generation",
      "Regional Origin Profiles",
      "Success and Hostile Outcomes",
      "Follow Behavior",
      "Wander Behavior",
      "Settlement Behavior",
      "Soul Echo Reaction",
      "Herb Recovery",
      "Settlement Membership",
      "Rekindled Interaction HUD",
      "Rekindled Save and Load",
    ],
    partial: [
      "Additional Character Archetypes",
      "Non-Archer Rekindled",
      "Profession Gameplay Effects",
      "Traits Gameplay Effects",
      "Resident Skills",
      "Resident Work Assignment",
      "Resident Needs and Morale",
      "Personal Dialogue",
      "Personal Quests",
      "Relationships Between Residents",
      "Rekindled Journal",
      "Rare Specialist Encounters",
      "Blueprint Leads by Origin",
      "Hostile Rekindled Combat Depth",
      "Resident Death and Memorial System",
    ],
  },
  "Combat & Progression": {
    completed: [
      "Levels 1–100",
      "XP Carry-Over",
      "Skill Points",
      "Crafting Points",
      "Scaled Health and Stamina",
      "Player Stat Modifier Framework",
      "Encumbrance",
      "Stamina Costs",
      "Skill Tree UI",
      "Level-Up Notification",
      "Unique XP Reward IDs",
      "Progression Validation Tool",
    ],
    partial: [
      "Item and Weapon Data Resources",
      "Armor Data Resources",
      "Rarity System",
      "Traits",
      "Set Bonuses",
      "Damage Calculation",
      "Armor Mitigation",
      "Equipment Bonuses",
      "Enemy Combat Framework",
      "Bow Combat",
      "Combat Status Effects",
      "Combat Balance",
      "Death and Respawn Rules",
      "Boss Framework",
    ],
  },
  "Quests & Narrative": {
    completed: [
      "Quest Tracker",
      "A New Beginning — Build Campfire",
      "Building Quest Progress",
      "Quest Save and Load",
    ],
    partial: [
      "Quest Journal",
      "Quest Chain After Campfire",
      "Settlement Introduction Quest",
      "First Rekindled Quest",
      "Quest Dialogue",
      "Branching Outcome Decision",
      "Quest Rewards",
      "Region Discovery Events",
      "Full Campaign Structure",
      "Books and World Notes",
      "Narrative Event Triggers",
    ],
  },
  "UI, HUD & Menus": {
    completed: [
      "Main Menu",
      "Save Slot Selection",
      "Settings",
      "Pause Menu",
      "Loading Overlay",
      "Inventory UI",
      "Quickbar UI",
      "Crafting Tab",
      "Skill Tree Tab",
      "Core Vitals HUD",
      "Souls HUD",
      "Compass and Quest Panel",
      "Held Item Panel",
      "Construction Panel",
      "Rekindled Focus HUD",
      "Pickup Notifications",
    ],
    partial: [
      "Journal Tab",
      "HUD Visibility Modes",
      "Combat HUD Mode",
      "Survival Danger Mode",
      "Settlement HUD Mode",
      "Status Effect HUD",
      "Notification Priority Queue",
      "Damage Feedback",
      "Healing Feedback",
      "Warmth Feedback",
      "Encumbrance Feedback",
      "Soul Collection Animation",
      "Rekindling Presentation",
      "Settlement Notifications",
      "HUD Accessibility Settings",
      "HUD Scale",
      "Reduced Motion",
      "Colorblind Support",
      "Tooltip Readability Final Pass",
    ],
  },
  Audio: {
    completed: [
      "AudioManager",
      "Tree Chopping Sounds",
      "Mining Sounds",
      "Menu UI Sounds",
      "Audio Asset Library",
    ],
    partial: [
      "Player Footsteps",
      "Water Footsteps",
      "Forest Ambience",
      "Ocean Ambience",
      "Lake Ambience",
      "Day and Night Ambience",
      "Wind Layers",
      "Campfire Audio",
      "Inventory Item Sounds",
      "Crafting Sounds",
      "Building Sounds",
      "Rekindling Sounds",
      "Chicken Sounds",
      "Combat Sounds",
      "Music System",
      "Biome Music",
      "Weather Audio",
      "Audio Zone Blending",
    ],
  },
  "Save, Tools & Technical": {
    completed: [
      "Versioned JSON Save Slots",
      "Player State Save",
      "Inventory Save",
      "Quickbar Save",
      "Equipment Save",
      "Progression Save",
      "Crafting Save",
      "Quest Save",
      "World Population Save",
      "Building Save",
      "Threaded Loading",
      "Ground Sampler",
      "Proximity Scan Optimization",
      "Grass Refresh Optimization",
    ],
    partial: [
      "Save Migration Test Suite",
      "Corrupted Save Handling",
      "Autosave Decision",
      "Crash Recovery Decision",
      "Performance Benchmark Scene",
      "Graphics Quality Presets",
      "Weather Save State",
      "Storage Container Save Tests",
      "NPC Scale Stress Test",
      "World Population Stress Test",
      "Build Export Test",
      "Input Remapping",
      "Controller Support",
      "Debug Menu",
      "Automated Smoke Test",
    ],
  },
  "Animals & Farming": {
    completed: [
      "Wild Chicken AI",
      "Chicken Flock Manager",
      "Roost Zones",
      "Chicken Behavior States",
      "Chicken Loot",
    ],
    partial: [
      "Chicken Taming",
      "Chicken Coop",
      "Egg Production",
      "Animal Feeding",
      "Breeding Decision",
      "Additional Wildlife",
      "Predator AI",
      "Fishing",
      "Crop Farming",
      "Livestock Framework",
    ],
  },
}

export const EVERWOOD_SPRINT_CARDS: PlanTaskCard[] = [
  {
    title: "Add Use Effects to Crafted Consumables",
    boardKey: "dev",
    listName: "Ready",
    priority: "high",
    milestone: "Prototype Stabilization",
    system: "Inventory & Crafting",
    acceptanceCriteria:
      "All three items can be used, produce visible feedback, modify the intended stat, and work after loading a save.",
    checklist: [
      "Define food restoration for Cooked Forest Meal",
      "Define food restoration for Cooked Chicken",
      "Define healing effect for Hearthleaf Bandage",
      "Decide whether bandage has use time",
      "Add animation or temporary action lock if needed",
      "Add use sound",
      "Add use feedback notification",
      "Prevent use when effect would be invalid, if appropriate",
      "Persist affected player stats correctly",
      "Test use from inventory",
      "Test use from quickbar",
      "Test after save/load",
      "Update item documentation",
    ],
  },
  {
    title: "Add Hearthleaf to World Gathering",
    boardKey: "dev",
    listName: "Ready",
    priority: "high",
    milestone: "Prototype Stabilization",
    system: "Gathering & Resources",
    acceptanceCriteria:
      "Players can reliably find and gather Hearthleaf in appropriate areas, and gathered plants persist or regrow according to the chosen design.",
    checklist: [
      "Create Hearthleaf world scene",
      "Create final or placeholder mesh",
      "Add collision/interact area",
      "Add gathering behavior",
      "Add respawn or regrowth rules",
      "Add spawn biome rules",
      "Add world-populator integration",
      "Add pickup notification",
      "Add gathering XP",
      "Add sound",
      "Add save/load state",
      "Test density and visibility",
      "Test that bandage progression is no longer blocked",
    ],
  },
  {
    title: "Connect Stone Pickaxe to Tool Gameplay",
    boardKey: "dev",
    listName: "Ready",
    priority: "high",
    milestone: "Prototype Stabilization",
    system: "Inventory & Crafting",
    acceptanceCriteria: "Stone Pickaxe works as a complete alternative to the starter Miner's Pickaxe.",
    checklist: [
      "Register Stone Pickaxe as a pickaxe tool",
      "Equip correctly from quickbar",
      "Use correct held model",
      "Trigger mining animation",
      "Consume stamina",
      "Damage stone deposits",
      "Damage Soulstone deposits if intended",
      "Apply durability loss",
      "Display durability in quickbar",
      "Save/load equipped state",
      "Test tool switching",
      "Test invalid targets",
    ],
  },
  {
    title: "Build Workbench Tier I",
    boardKey: "dev",
    listName: "Ready",
    priority: "high",
    milestone: "Settlement Foundation",
    system: "Building & Settlement",
    acceptanceCriteria:
      "The player can craft, place, construct and use a Workbench Tier I, and workbench-gated recipes correctly recognize it.",
    checklist: [
      "Finalize workbench gameplay purpose",
      "Create workbench scene",
      "Create preview/ghost placement",
      "Add placement validation",
      "Add construction material requirements",
      "Add construction site integration",
      "Add completed workbench state",
      "Register as crafting station",
      "Detect nearby workbench for recipes",
      "Add interaction prompt",
      "Add crafting UI station state",
      "Add build and interaction sounds",
      "Save/load placed workbench",
      "Test Improved Workbench dependency",
      "Test multiple workbenches",
      "Add related lore/design entry",
    ],
  },
  {
    title: "Build Wooden Storage Box",
    boardKey: "dev",
    listName: "Ready",
    priority: "high",
    milestone: "Settlement Foundation",
    system: "Building & Settlement",
    acceptanceCriteria:
      "Placed boxes safely store items across save/load with no duplication or item loss.",
    checklist: [
      "Decide storage capacity",
      "Create storage box scene",
      "Create placement preview",
      "Add construction requirements",
      "Add interaction prompt",
      "Create storage inventory container",
      "Support item transfer",
      "Prevent item duplication",
      "Handle full container",
      "Save container contents",
      "Save world placement",
      "Test multiple storage boxes",
      "Test save/load",
      "Add opening/closing feedback",
      "Add audio",
      "Add permissions placeholder for future NPC use",
    ],
  },
  {
    title: "Integrate Core Ambient Audio",
    boardKey: "dev",
    listName: "Ready",
    priority: "high",
    milestone: "Prototype Stabilization",
    system: "Audio",
    acceptanceCriteria:
      "Exploration no longer feels silent, and ambience changes naturally without obvious audio cuts or duplicated loops.",
    checklist: [
      "Add forest ambience loop",
      "Add ocean ambience near coast",
      "Add water ambience near lakes",
      "Add wind ambience linked to wind strength",
      "Add grass/ground footsteps",
      "Add water footsteps and splashes",
      "Add day/night ambience variation",
      "Add spatial blending zones",
      "Add volume settings",
      "Prevent loop stacking",
      "Test transitions",
      "Test performance",
      "Document audio buses",
    ],
  },
  {
    title: "Save and Load Regression",
    boardKey: "bugs",
    listName: "New",
    priority: "high",
    milestone: "Prototype Stabilization",
    checklist: [
      "Start fresh save",
      "Gather all basic resources",
      "Craft starter items",
      "Build campfire",
      "Build Settlement Hearth",
      "Rekindle one NPC",
      "Change equipment",
      "Fill water bottle",
      "Save",
      "Exit to menu",
      "Load",
      "Verify player position",
      "Verify inventory",
      "Verify quickbar",
      "Verify equipment",
      "Verify vitals",
      "Verify world resources",
      "Verify buildings",
      "Verify Rekindled",
      "Verify quest state",
    ],
  },
  {
    title: "Fresh-Save Critical Path Test",
    boardKey: "bugs",
    listName: "New",
    priority: "high",
    milestone: "Prototype Stabilization",
    checklist: [
      "Spawn correctly",
      "Find wood",
      "Find stone",
      "Craft required items",
      "Build campfire",
      "Recover food and water",
      "Understand the next objective",
      "No progression blocker",
    ],
  },
  {
    title: "Update Game Status Document",
    boardKey: "dev",
    listName: "Planned",
    priority: "medium",
    milestone: "Prototype Stabilization",
    description: "Keep docs/GAME_STATUS.md aligned with DevelopmentOS cards after each sprint.",
  },
  {
    title: "Lock Final Game Title",
    boardKey: "dev",
    listName: "Planned",
    priority: "high",
    milestone: "Narrative and Quest Foundation",
    description: "Choose between Fires of Everwood and Souls of Everwood before public-facing material.",
  },
]

export const EVERWOOD_MILESTONES: PlanMilestone[] = [
  {
    name: "Prototype Stabilization",
    slug: "prototype-stabilization",
    horizonList: "Prototype Stabilization",
    description: "Make all currently craftable and visible prototype systems function consistently.",
    checklist: [
      "Crafted consumable use effects",
      "Hearthleaf world gathering",
      "Stone Pickaxe tool connection",
      "Core ambient audio",
      "Inventory tooltip final pass",
      "Save/load regression test",
      "Fresh-save full-loop test",
      "Existing-save migration test",
      "Bug triage and cleanup",
    ],
    exitCriteria:
      "A player can start a new game, gather resources, survive, craft and use essential items, build a campfire, Rekindle an NPC, save, quit, load, and continue without progression blockers.",
  },
  {
    name: "Settlement Foundation",
    slug: "settlement-foundation",
    horizonList: "Settlement Foundation",
    description: "Turn the Settlement Hearth from a boundary system into the beginning of a functional home.",
    checklist: [
      "Workbench Tier I",
      "Wooden Storage Box",
      "Settlement radius upgrade UI",
      "Settlement member overview",
      "Assign basic settlement roles",
      "Basic NPC needs/status overview",
      "Settlement construction activity",
      "Settlement save/load stress test",
      "First settlement-specific quest",
    ],
    exitCriteria:
      "The player can establish a settlement, add at least one resident, build storage and a workbench, and see the settlement's current members and needs.",
  },
  {
    name: "Combat Foundation",
    slug: "combat-foundation",
    horizonList: "Combat Foundation",
    description: "Create a reusable combat layer before adding many enemies.",
    checklist: [
      "Damage model design",
      "Weapon data resources",
      "Armor data resources",
      "Damage calculation",
      "Armor mitigation",
      "Player hit reactions",
      "Enemy health and hit reactions",
      "Death and loot flow",
      "Hunting Bow",
      "Basic hostile enemy",
      "Combat HUD mode",
      "Combat audio",
      "Save compatibility",
    ],
    exitCriteria:
      "The player can fight at least one hostile enemy with melee and ranged combat, take mitigated damage, heal, and receive clear feedback.",
  },
]

export const EVERWOOD_DECISIONS: PlanDecision[] = [
  {
    title: "Lock the Final Game Title",
    slug: "lock-final-game-title",
    context: "Current documents use both Fires of Everwood and Souls of Everwood.",
    problem: "Decision required before store pages, branding, lore headers and export builds.",
    options: "- Fires of Everwood\n- Souls of Everwood",
  },
  {
    title: "Define Bow Prototype Scope",
    slug: "bow-prototype-scope",
    context: "Hunting bow exists in data but not gameplay.",
    problem: "Choose implementation scope for first bow prototype.",
    options:
      "- Simple projectile bow first (recommended)\n- Full draw strength, trajectory and ammunition immediately",
  },
  {
    title: "Define Storage Rules",
    slug: "storage-rules",
    context: "Wooden storage box is being added to the prototype.",
    problem: "Choose storage capacity model.",
    options:
      "- Fixed slots initially (recommended)\n- Weight-based capacity\n- Both slots and weight",
  },
  {
    title: "Define Settlement Resident Control",
    slug: "settlement-resident-control",
    context: "Settlement systems are expanding beyond the Hearth boundary.",
    problem: "Choose how direct player control over residents should be.",
    options:
      "- Direct task assignment\n- Priority-based autonomous work\n- Hybrid system (recommended)",
  },
]

export const EVERWOOD_DESIGN_DOCS: PlanDesignDoc[] = [
  {
    title: "Game Status — Living Document",
    category: "production-reference",
    status: "approved",
    summary: "Living checklist synced with DevelopmentOS and the Godot repo.",
  },
  {
    title: "Sky and Weather System Plan",
    category: "technical-design",
    status: "approved",
    summary: "Deferred weather implementation plan for World Atmosphere milestone.",
  },
  {
    title: "World Geography and Rekindled Origins",
    category: "canonical-lore-design",
    status: "approved",
    summary: "Canonical geography and Rekindled origin profiles.",
  },
  {
    title: "Progression System",
    category: "gameplay-system-design",
    status: "approved",
    summary: "Phase 1 implemented; phase 2 combat/progression pending.",
  },
  {
    title: "HUD Behavior, Feedback and Notification Plan",
    category: "ui-ux-design",
    status: "approved",
    summary: "Approved HUD feedback plan linked to UI implementation cards.",
  },
]

export const EVERWOOD_LORE_ENTRIES: PlanLoreEntry[] = [
  { name: "Everwood — World Overview", slug: "everwood-world-overview", entryType: "magic_system", collection: "world-rules" },
  { name: "The Hearth", slug: "the-hearth", entryType: "magic_system", collection: "world-rules" },
  { name: "Rekindling", slug: "rekindling", entryType: "magic_system", collection: "world-rules" },
  { name: "Souls and Soul Stability", slug: "souls-and-soul-stability", entryType: "magic_system", collection: "world-rules" },
  { name: "Corruption and Taint", slug: "corruption-and-taint", entryType: "magic_system", collection: "world-rules" },
  { name: "Blueprint Memories", slug: "blueprint-memories", entryType: "magic_system", collection: "world-rules" },
  { name: "Death and Identity Persistence", slug: "death-and-identity-persistence", entryType: "magic_system", collection: "world-rules" },
  { name: "Everwood", slug: "everwood", entryType: "region", collection: "regions" },
  { name: "Hearthvale", slug: "hearthvale", entryType: "region", collection: "regions" },
  { name: "Rivermark", slug: "rivermark", entryType: "region", collection: "regions" },
  { name: "Ironreach", slug: "ironreach", entryType: "region", collection: "regions" },
  { name: "Greenmere", slug: "greenmere", entryType: "region", collection: "regions" },
  { name: "Stonewarden Hold", slug: "stonewarden-hold", entryType: "region", collection: "regions" },
  { name: "Frosthollow", slug: "frosthollow", entryType: "region", collection: "regions" },
  { name: "Rekindled — Overview", slug: "rekindled-overview", entryType: "story_arc", collection: "characters" },
  { name: "Rekindled Identity Rules", slug: "rekindled-identity-rules", entryType: "story_arc", collection: "characters" },
  { name: "Rekindled Regional Origins", slug: "rekindled-regional-origins", entryType: "story_arc", collection: "characters" },
]

export function buildEverwoodPlanCards(): PlanTaskCard[] {
  const cards: PlanTaskCard[] = [...EVERWOOD_SPRINT_CARDS]

  for (const [listName, groups] of Object.entries(EVERWOOD_SYSTEMS_BOARD)) {
    for (const title of groups.completed) {
      cards.push({
        title,
        boardKey: "systems",
        listName,
        status: "done",
        priority: "low",
        featureState: "Playable",
        system: listName,
      })
    }
    for (const title of groups.partial) {
      cards.push({
        title,
        boardKey: "systems",
        listName,
        status: "backlog",
        priority: "medium",
        featureState: "Partial",
        system: listName,
      })
    }
  }

  for (const title of EVERWOOD_PLAYABLE_SYSTEMS) {
    cards.push({
      title,
      boardKey: "systems",
      listName: "Save, Tools & Technical",
      status: "done",
      priority: "low",
      featureState: "Playable",
      description: "Imported from playable systems snapshot.",
    })
  }

  return cards
}
