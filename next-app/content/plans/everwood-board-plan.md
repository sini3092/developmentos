# DevelopmentOS Board Plan — Everwood Game Project

**Prepared from the current game-status document and supporting design plans.**  
**Recommended project name inside DevelopmentOS:** `Everwood Game` until the final title is locked.

> Important naming issue: the current documents use both **Fires of Everwood** and **Souls of Everwood**. Add a project decision card to select one canonical title before creating more public-facing material.

---

# 1. Recommended Board Architecture

The current board groups large systems into lists such as `UI Parts`, `WorldGen`, and `Rekindled`, with one large card inside each list. That works as a rough notebook, but it will become difficult to answer:

- What is finished?
- What is currently being worked on?
- What is blocked?
- What should be built next?
- Which milestone does a task belong to?
- Who owns the task?
- What was tested and accepted?

Use **separate boards for separate purposes** instead of placing everything on one board.

## Board A — Game Development

This is the daily implementation board.

### Lists

1. `Inbox`
2. `Planned`
3. `Ready`
4. `In Progress`
5. `Needs Testing`
6. `Blocked`
7. `Done`
8. `Deferred`

Cards move between these lists as work progresses.

## Board B — Game Systems

This is the permanent system overview.

### Lists

1. `Core Player`
2. `World & Environment`
3. `Gathering & Resources`
4. `Inventory & Crafting`
5. `Building & Settlement`
6. `Rekindled & NPCs`
7. `Combat & Progression`
8. `Quests & Narrative`
9. `UI, HUD & Menus`
10. `Audio`
11. `Save, Tools & Technical`
12. `Animals & Farming`

Each card represents a **feature or system**, not an entire category.

## Board C — Roadmap

### Lists

1. `Prototype Stabilization`
2. `Core Survival Loop`
3. `Settlement Foundation`
4. `Combat Foundation`
5. `World Atmosphere`
6. `Content Expansion`
7. `Vertical Slice`
8. `Later / Post-Prototype`

## Board D — Bugs & Polish

### Lists

1. `New`
2. `Confirmed`
3. `In Progress`
4. `Needs Retest`
5. `Fixed`
6. `Won't Fix / Deferred`

## Board E — Lore & Narrative

This should link to the dedicated Lore module rather than duplicate all lore text.

### Lists

1. `World Rules`
2. `Regions`
3. `Characters`
4. `Factions`
5. `History`
6. `Creatures`
7. `Items & Artifacts`
8. `Quests & Story`
9. `Needs Review`
10. `Canon`

---

# 2. Standard Card Structure

Every implementation card should use the same structure.

## Required fields

- **Title**
- **System**
- **Milestone**
- **Status**
- **Priority**
- **Owner**
- **Reviewer**
- **Estimate**
- **Target date**
- **Related files**
- **Related lore**
- **Dependencies**
- **Acceptance criteria**
- **Known bugs**
- **Last update author**
- **Last update date**

## Recommended labels

### Priority

- `P0 Critical`
- `P1 High`
- `P2 Medium`
- `P3 Low`

### Discipline

- `Programming`
- `Game Design`
- `3D Art`
- `Animation`
- `UI/UX`
- `Audio`
- `Narrative`
- `Testing`
- `Technical Art`

### Feature state

- `Playable`
- `Partial`
- `Data Only`
- `Design Only`
- `Needs Polish`
- `Needs Test`
- `Blocked`

## Standard checklist

```text
Definition
[ ] Goal and player value are clear
[ ] Scope is limited
[ ] Dependencies are linked
[ ] Relevant design document is linked

Implementation
[ ] Data/resources created
[ ] Core logic implemented
[ ] UI/feedback implemented
[ ] Audio implemented where required
[ ] Save/load support implemented
[ ] Error handling implemented

Validation
[ ] Tested in a fresh save
[ ] Tested in an existing save
[ ] Tested after loading
[ ] Tested for edge cases
[ ] Performance checked
[ ] Acceptance criteria passed
[ ] Documentation updated
```

A card should only move to `Done` when its acceptance criteria have passed. “Code exists” is not the same as “feature is complete.”

---

# 3. Current Project Snapshot

## Already Playable

The following systems are sufficiently implemented to be entered as completed cards, but each should still receive a card so the project history is complete.

- Procedural Terrain3D world
- Island world with ocean and lakes
- Water shader and shallow-water wading
- Shoreline spawn
- Loading screen and threaded launch flow
- Player movement, sprint, jump and landing
- Day/night cycle
- Wind manager
- Grass streaming around the player
- World population system
- Tree chopping and log collection
- Stone and Soulstone mining
- Berry and fiber gathering
- Ground item drops and pickup
- Wild chicken AI and loot
- Inventory
- Quickbar
- Equipment slots
- Crafting queue and knowledge nodes
- Campfire building and campfire crafting
- Settlement Hearth placement and construction
- Rekindled body generation and ritual
- Basic Rekindled follow/wander/settlement behavior
- Player progression phase 1
- Food, water, warmth and encumbrance
- Skill tree UI
- Initial campfire quest
- Main menu, settings, save slots and pause menu
- Save/load of player and world state
- Basic gameplay HUD
- Initial audio manager and connected harvest sounds

Do not hide these in an archive. Add them as completed cards with their key files, completion date where known, and any remaining polish linked as separate follow-up cards.

---

# 4. Game Development Board — Immediate Cards

These are the cards that should be created first in the daily workflow board.

## P1 — High Priority

### Card: Add Use Effects to Crafted Consumables

**System:** Inventory & Crafting  
**Milestone:** Prototype Stabilization  
**Status:** Ready  
**Priority:** P1 High

**Scope**

Make the following items usable from inventory and quickbar:

- Cooked Forest Meal
- Cooked Chicken
- Hearthleaf Bandage

**Checklist**

- [ ] Define food restoration for Cooked Forest Meal
- [ ] Define food restoration for Cooked Chicken
- [ ] Define healing effect for Hearthleaf Bandage
- [ ] Decide whether bandage has use time
- [ ] Add animation or temporary action lock if needed
- [ ] Add use sound
- [ ] Add use feedback notification
- [ ] Prevent use when effect would be invalid, if appropriate
- [ ] Persist affected player stats correctly
- [ ] Test use from inventory
- [ ] Test use from quickbar
- [ ] Test after save/load
- [ ] Update item documentation

**Acceptance criteria**

All three items can be used, produce visible feedback, modify the intended stat, and work after loading a save.

---

### Card: Add Hearthleaf to World Gathering

**System:** Gathering & Resources  
**Milestone:** Prototype Stabilization  
**Status:** Ready  
**Priority:** P1 High

**Checklist**

- [ ] Create Hearthleaf world scene
- [ ] Create final or placeholder mesh
- [ ] Add collision/interact area
- [ ] Add gathering behavior
- [ ] Add respawn or regrowth rules
- [ ] Add spawn biome rules
- [ ] Add world-populator integration
- [ ] Add pickup notification
- [ ] Add gathering XP
- [ ] Add sound
- [ ] Add save/load state
- [ ] Test density and visibility
- [ ] Test that bandage progression is no longer blocked

**Acceptance criteria**

Players can reliably find and gather Hearthleaf in appropriate areas, and gathered plants persist or regrow according to the chosen design.

---

### Card: Connect Stone Pickaxe to Tool Gameplay

**System:** Inventory & Crafting  
**Milestone:** Prototype Stabilization  
**Status:** Ready  
**Priority:** P1 High

**Checklist**

- [ ] Register Stone Pickaxe as a pickaxe tool
- [ ] Equip correctly from quickbar
- [ ] Use correct held model
- [ ] Trigger mining animation
- [ ] Consume stamina
- [ ] Damage stone deposits
- [ ] Damage Soulstone deposits if intended
- [ ] Apply durability loss
- [ ] Display durability in quickbar
- [ ] Save/load equipped state
- [ ] Test tool switching
- [ ] Test invalid targets

**Acceptance criteria**

Stone Pickaxe works as a complete alternative to the starter Miner's Pickaxe.

---

### Card: Build Workbench Tier I

**System:** Building & Settlement  
**Milestone:** Settlement Foundation  
**Status:** Ready  
**Priority:** P1 High

**Checklist**

- [ ] Finalize workbench gameplay purpose
- [ ] Create workbench scene
- [ ] Create preview/ghost placement
- [ ] Add placement validation
- [ ] Add construction material requirements
- [ ] Add construction site integration
- [ ] Add completed workbench state
- [ ] Register as crafting station
- [ ] Detect nearby workbench for recipes
- [ ] Add interaction prompt
- [ ] Add crafting UI station state
- [ ] Add build and interaction sounds
- [ ] Save/load placed workbench
- [ ] Test Improved Workbench dependency
- [ ] Test multiple workbenches
- [ ] Add related lore/design entry

**Acceptance criteria**

The player can craft, place, construct and use a Workbench Tier I, and workbench-gated recipes correctly recognize it.

---

### Card: Build Wooden Storage Box

**System:** Building & Settlement  
**Milestone:** Settlement Foundation  
**Status:** Ready  
**Priority:** P1 High

**Checklist**

- [ ] Decide storage capacity
- [ ] Create storage box scene
- [ ] Create placement preview
- [ ] Add construction requirements
- [ ] Add interaction prompt
- [ ] Create storage inventory container
- [ ] Support item transfer
- [ ] Prevent item duplication
- [ ] Handle full container
- [ ] Save container contents
- [ ] Save world placement
- [ ] Test multiple storage boxes
- [ ] Test save/load
- [ ] Add opening/closing feedback
- [ ] Add audio
- [ ] Add permissions placeholder for future NPC use

**Acceptance criteria**

Placed boxes safely store items across save/load with no duplication or item loss.

---

### Card: Integrate Core Ambient Audio

**System:** Audio  
**Milestone:** Prototype Stabilization  
**Status:** Ready  
**Priority:** P1 High

**Checklist**

- [ ] Add forest ambience loop
- [ ] Add ocean ambience near coast
- [ ] Add water ambience near lakes
- [ ] Add wind ambience linked to wind strength
- [ ] Add grass/ground footsteps
- [ ] Add water footsteps and splashes
- [ ] Add day/night ambience variation
- [ ] Add spatial blending zones
- [ ] Add volume settings
- [ ] Prevent loop stacking
- [ ] Test transitions
- [ ] Test performance
- [ ] Document audio buses

**Acceptance criteria**

Exploration no longer feels silent, and ambience changes naturally without obvious audio cuts or duplicated loops.

---

# 5. Next Cards After Prototype Stabilization

## P1 / P2 — Core Survival and Utility

### Card: Implement Torch Equipment and Light

- [ ] Equip torch from quickbar
- [ ] Attach model to player hand
- [ ] Add light source
- [ ] Add flame VFX
- [ ] Add equip/unequip animation
- [ ] Add burn duration or fuel decision
- [ ] Add warmth contribution decision
- [ ] Add rain interaction later
- [ ] Add save/load
- [ ] Add audio
- [ ] Test night readability

### Card: Implement Leather Backpack Capacity Bonus

- [ ] Define capacity bonus
- [ ] Apply stat modifier through PlayerStats
- [ ] Remove modifier when unequipped
- [ ] Handle overencumbrance after removal
- [ ] Display bonus in equipment tooltip
- [ ] Save/load equipped bonus
- [ ] Test duplicate modifier prevention

### Card: Implement Basic Hunting Bow

- [ ] Define first bow combat scope
- [ ] Equip bow
- [ ] Add aiming state
- [ ] Add projectile or hitscan decision
- [ ] Create arrows or temporary unlimited-ammo prototype
- [ ] Add draw and release animation
- [ ] Add stamina cost
- [ ] Damage chickens and hostile Rekindled
- [ ] Add reticle feedback
- [ ] Add sound
- [ ] Save/load
- [ ] Balance first-pass damage

### Card: Add Blueprint Drops to the World

- [ ] Define possible drop sources
- [ ] Define rarity and duplication rules
- [ ] Add loot tables
- [ ] Add world pickups
- [ ] Add discovery feedback
- [ ] Connect to research UI
- [ ] Save unlocked fragments
- [ ] Test deterministic world behavior
- [ ] Link blueprint types to Rekindled origins

### Card: Build Journal and Quest Log

- [ ] Replace placeholder tab
- [ ] Show active quests
- [ ] Show completed quests
- [ ] Show objectives
- [ ] Show rewards
- [ ] Track one selected quest on HUD
- [ ] Add Rekindled stories section
- [ ] Add discovered region/lore section
- [ ] Save journal state
- [ ] Add filters
- [ ] Add empty states
- [ ] Test controller/keyboard navigation

---

# 6. Roadmap Milestones

## Milestone 1 — Prototype Stabilization

**Goal:** Make all currently craftable and visible prototype systems function consistently.

### Required cards

- [ ] Crafted consumable use effects
- [ ] Hearthleaf world gathering
- [ ] Stone Pickaxe tool connection
- [ ] Core ambient audio
- [ ] Inventory tooltip final pass
- [ ] Save/load regression test
- [ ] Fresh-save full-loop test
- [ ] Existing-save migration test
- [ ] Bug triage and cleanup

### Exit criteria

A player can start a new game, gather resources, survive, craft and use essential items, build a campfire, Rekindle an NPC, save, quit, load, and continue without progression blockers.

---

## Milestone 2 — Settlement Foundation

**Goal:** Turn the Settlement Hearth from a boundary system into the beginning of a functional home.

### Required cards

- [ ] Workbench Tier I
- [ ] Wooden Storage Box
- [ ] Settlement radius upgrade UI
- [ ] Settlement member overview
- [ ] Assign basic settlement roles
- [ ] Basic NPC needs/status overview
- [ ] Settlement construction activity
- [ ] Settlement save/load stress test
- [ ] First settlement-specific quest

### Exit criteria

The player can establish a settlement, add at least one resident, build storage and a workbench, and see the settlement's current members and needs.

---

## Milestone 3 — Combat Foundation

**Goal:** Create a reusable combat layer before adding many enemies.

### Required cards

- [ ] Damage model design
- [ ] Weapon data resources
- [ ] Armor data resources
- [ ] Damage calculation
- [ ] Armor mitigation
- [ ] Player hit reactions
- [ ] Enemy health and hit reactions
- [ ] Death and loot flow
- [ ] Hunting Bow
- [ ] Basic hostile enemy
- [ ] Combat HUD mode
- [ ] Combat audio
- [ ] Save compatibility

### Exit criteria

The player can fight at least one hostile enemy with melee and ranged combat, take mitigated damage, heal, and receive clear feedback.

---

## Milestone 4 — Core Survival Loop

**Goal:** Expand survival from existing bars into meaningful choices.

### Required cards

- [ ] More food sources
- [ ] Cooking recipe expansion
- [ ] Shelter detection
- [ ] Wetness status
- [ ] Status-effect framework
- [ ] Torch and light
- [ ] Equipment stat bonuses
- [ ] Backpack capacity bonus
- [ ] Cold and warmth tuning
- [ ] Survival notifications
- [ ] Basic fishing design decision
- [ ] Basic farming design decision

### Exit criteria

Food, water, warmth, shelter, equipment and status effects influence exploration without becoming constant busywork.

---

## Milestone 5 — World Atmosphere

**Goal:** Make the world feel alive before increasing map size or content volume.

### Required cards

- [ ] Ambient audio integration
- [ ] Improved biome ambience
- [ ] Physical sky integration
- [ ] Weather baseline profiling
- [ ] Sunshine Clouds isolated test
- [ ] WeatherManager
- [ ] Clear / cloudy / rain profiles
- [ ] Forest mist
- [ ] Wind unification
- [ ] Wetness
- [ ] Quality levels
- [ ] Weather save/load

### Exit criteria

Day, night, fog, wind, clouds, rain and audio form a coherent system with acceptable performance.

---

## Milestone 6 — Narrative and Quest Foundation

**Goal:** Give the existing world systems context and purpose.

### Required cards

- [ ] Lock final game title
- [ ] Canonical world overview
- [ ] Canonical region entries
- [ ] Everwood history
- [ ] Hearth lore
- [ ] Rekindling rules
- [ ] Main player role
- [ ] First quest chain after Campfire
- [ ] First Rekindled personal quest
- [ ] Journal
- [ ] Quest reward framework
- [ ] Dialogue framework
- [ ] Lore/task links

### Exit criteria

The player understands what Everwood is, what the Hearth does, what Rekindled are, and has a meaningful short quest chain beyond the tutorial.

---

## Milestone 7 — Vertical Slice

**Goal:** Produce a compact, polished play session that represents the final game direction.

### Proposed vertical-slice content

- One polished starting region
- One functioning settlement
- 3–5 Rekindled residents
- One complete quest chain
- One hostile enemy family
- One ranged weapon
- Core gathering and crafting
- Campfire, storage and workbench
- Day/night and limited weather
- Strong ambient sound
- Save/load
- Polished HUD feedback
- 30–60 minutes of directed gameplay

Do not attempt the full map, full quest campaign, multiplayer, boats, farming and many regions before this slice is complete.

---

# 7. Permanent Game Systems Board Cards

Create the following cards even when they are already done. Set their current status accurately.

## Core Player

### Completed

- `Third-Person Movement`
- `Sprint and Stamina Consumption`
- `Jump and Landing`
- `Camera System`
- `Tool Use — Axe`
- `Tool Use — Pickaxe`
- `Sit Interaction`
- `Inventory Weight Movement Effects`
- `Player Save and Load`

### Partial / Missing

- `Swimming`
- `Bow Aiming and Shooting`
- `Combat Dodge or Block Decision`
- `Player Damage Reactions`
- `Status Effects`
- `Shelter Detection`

---

## World & Environment

### Completed

- `Procedural Terrain3D World`
- `Island, Ocean and Lakes`
- `Water Shader`
- `Shallow-Water Wading`
- `Shoreline Spawn`
- `World Loading Flow`
- `Grass Streaming`
- `Day and Night Cycle`
- `Wind Manager`
- `World Population`
- `Berry Bush Streaming and Regrowth`

### Partial / Missing

- `Physical Sky`
- `WeatherManager`
- `Cloud System`
- `Rain`
- `Snow`
- `Forest Mist`
- `Wetness`
- `Indoor Weather Exclusion`
- `Weather Quality Levels`
- `Biome Definitions`
- `Biome-Specific Population Rules`
- `Region Discovery`
- `Map and Fog of War`
- `Deep-Water Gameplay`
- `Emberstone Deposits`

---

## Gathering & Resources

### Completed

- `Tree Chopping`
- `Log Pickups`
- `Stone Mining`
- `Soulstone Mining`
- `Berry Gathering`
- `Fiber Gathering`
- `Ground Item Pickups`
- `Chicken Hunting`

### Partial / Missing

- `Hearthleaf Gathering`
- `Emberstone Mining`
- `Fishing`
- `Farming`
- `Resource Quality or Rarity Decision`
- `Tool Tier Efficiency`
- `Resource Respawn Balancing`

---

## Inventory & Crafting

### Completed

- `42-Slot Inventory`
- `12-Slot Quickbar`
- `Drag and Drop`
- `Stack Splitting`
- `Context Menu`
- `Equipment Panel`
- `Item Tooltips`
- `Durability Display`
- `Water Bottle Fill Display`
- `Crafting Queue`
- `Knowledge Nodes`
- `Campfire Station Recipes`
- `Blueprint Research Data`
- `Crafting XP`

### Partial / Missing

- `Crafted Consumable Use Effects`
- `Stone Pickaxe Tool Registration`
- `Workbench Station`
- `Blueprint World Drops`
- `Equipment Stat Bonuses`
- `Backpack Capacity Bonus`
- `Torch Gameplay`
- `Soul Lantern Gameplay`
- `Crafting Recipe Balance Pass`
- `Item Rarity Resources`
- `Weapon and Armor Data Resources`
- `Set Bonuses`
- `Inventory Tooltip Final Polish`

---

## Building & Settlement

### Completed

- `Placeable Preview`
- `Placement Validation`
- `Construction Site`
- `Material Delivery`
- `Construction Completion`
- `Campfire`
- `Settlement Hearth`
- `Settlement Boundary`
- `Settlement Membership`
- `Building Persistence`

### Partial / Missing

- `Wooden Storage Box`
- `Workbench Tier I`
- `Improved Workbench`
- `Settlement Radius Upgrade UI`
- `Settlement Management Screen`
- `Resident Role Assignment`
- `Settlement Resource Overview`
- `Resident Needs`
- `Production Buildings`
- `Builder's Hut Decision`
- `Chicken Coop`
- `Building Upgrade Framework`
- `Building Demolition or Relocation`
- `Settlement Attack Framework`

---

## Rekindled & NPCs

### Completed

- `Rekindled Body Spawning`
- `Inspect Remains`
- `Rekindling Ritual`
- `Deterministic Identity Generation`
- `Regional Origin Profiles`
- `Success and Hostile Outcomes`
- `Follow Behavior`
- `Wander Behavior`
- `Settlement Behavior`
- `Soul Echo Reaction`
- `Herb Recovery`
- `Settlement Membership`
- `Rekindled Interaction HUD`
- `Rekindled Save and Load`

### Partial / Missing

- `Additional Character Archetypes`
- `Non-Archer Rekindled`
- `Profession Gameplay Effects`
- `Traits Gameplay Effects`
- `Resident Skills`
- `Resident Work Assignment`
- `Resident Needs and Morale`
- `Personal Dialogue`
- `Personal Quests`
- `Relationships Between Residents`
- `Rekindled Journal`
- `Rare Specialist Encounters`
- `Blueprint Leads by Origin`
- `Hostile Rekindled Combat Depth`
- `Resident Death and Memorial System`

---

## Combat & Progression

### Completed

- `Levels 1–100`
- `XP Carry-Over`
- `Skill Points`
- `Crafting Points`
- `Scaled Health and Stamina`
- `Player Stat Modifier Framework`
- `Encumbrance`
- `Stamina Costs`
- `Skill Tree UI`
- `Level-Up Notification`
- `Unique XP Reward IDs`
- `Progression Validation Tool`

### Partial / Missing

- `Item and Weapon Data Resources`
- `Armor Data Resources`
- `Rarity System`
- `Traits`
- `Set Bonuses`
- `Damage Calculation`
- `Armor Mitigation`
- `Equipment Bonuses`
- `Enemy Combat Framework`
- `Bow Combat`
- `Combat Status Effects`
- `Combat Balance`
- `Death and Respawn Rules`
- `Boss Framework`

---

## Quests & Narrative

### Completed

- `Quest Tracker`
- `A New Beginning — Build Campfire`
- `Building Quest Progress`
- `Quest Save and Load`

### Partial / Missing

- `Quest Journal`
- `Quest Chain After Campfire`
- `Settlement Introduction Quest`
- `First Rekindled Quest`
- `Quest Dialogue`
- `Branching Outcome Decision`
- `Quest Rewards`
- `Region Discovery Events`
- `Full Campaign Structure`
- `Books and World Notes`
- `Narrative Event Triggers`

---

## UI, HUD & Menus

### Completed

- `Main Menu`
- `Save Slot Selection`
- `Settings`
- `Pause Menu`
- `Loading Overlay`
- `Inventory UI`
- `Quickbar UI`
- `Crafting Tab`
- `Skill Tree Tab`
- `Core Vitals HUD`
- `Souls HUD`
- `Compass and Quest Panel`
- `Held Item Panel`
- `Construction Panel`
- `Rekindled Focus HUD`
- `Pickup Notifications`

### Partial / Missing

- `Journal Tab`
- `HUD Visibility Modes`
- `Combat HUD Mode`
- `Survival Danger Mode`
- `Settlement HUD Mode`
- `Status Effect HUD`
- `Notification Priority Queue`
- `Damage Feedback`
- `Healing Feedback`
- `Warmth Feedback`
- `Encumbrance Feedback`
- `Soul Collection Animation`
- `Rekindling Presentation`
- `Settlement Notifications`
- `HUD Accessibility Settings`
- `HUD Scale`
- `Reduced Motion`
- `Colorblind Support`
- `Tooltip Readability Final Pass`

---

## Audio

### Completed

- `AudioManager`
- `Tree Chopping Sounds`
- `Mining Sounds`
- `Menu UI Sounds`
- `Audio Asset Library`

### Partial / Missing

- `Player Footsteps`
- `Water Footsteps`
- `Forest Ambience`
- `Ocean Ambience`
- `Lake Ambience`
- `Day and Night Ambience`
- `Wind Layers`
- `Campfire Audio`
- `Inventory Item Sounds`
- `Crafting Sounds`
- `Building Sounds`
- `Rekindling Sounds`
- `Chicken Sounds`
- `Combat Sounds`
- `Music System`
- `Biome Music`
- `Weather Audio`
- `Audio Zone Blending`

---

## Save, Tools & Technical

### Completed

- `Versioned JSON Save Slots`
- `Player State Save`
- `Inventory Save`
- `Quickbar Save`
- `Equipment Save`
- `Progression Save`
- `Crafting Save`
- `Quest Save`
- `World Population Save`
- `Building Save`
- `Threaded Loading`
- `Ground Sampler`
- `Proximity Scan Optimization`
- `Grass Refresh Optimization`

### Partial / Missing

- `Save Migration Test Suite`
- `Corrupted Save Handling`
- `Autosave Decision`
- `Crash Recovery Decision`
- `Performance Benchmark Scene`
- `Graphics Quality Presets`
- `Weather Save State`
- `Storage Container Save Tests`
- `NPC Scale Stress Test`
- `World Population Stress Test`
- `Build Export Test`
- `Input Remapping`
- `Controller Support`
- `Debug Menu`
- `Automated Smoke Test`

---

## Animals & Farming

### Completed

- `Wild Chicken AI`
- `Chicken Flock Manager`
- `Roost Zones`
- `Chicken Behavior States`
- `Chicken Loot`

### Partial / Missing

- `Chicken Taming`
- `Chicken Coop`
- `Egg Production`
- `Animal Feeding`
- `Breeding Decision`
- `Additional Wildlife`
- `Predator AI`
- `Fishing`
- `Crop Farming`
- `Livestock Framework`

---

# 8. Lore Entries to Add to DevelopmentOS

The supporting geography document already defines important canonical material. Convert it into structured Lore entries instead of leaving it only in one markdown document.

## World Rules

- `Everwood — World Overview`
- `The Hearth`
- `Rekindling`
- `Souls and Soul Stability`
- `Corruption and Taint`
- `Blueprint Memories`
- `Death and Identity Persistence`

## Regions

Create one entry for each:

- `Everwood`
- `Hearthvale`
- `Rivermark`
- `Ironreach`
- `Greenmere`
- `Stonewarden Hold`
- `Frosthollow`

Each region entry should contain:

- Current state
- Primary knowledge
- Typical professions
- Environmental identity
- Important resources
- Cultural traits
- Relationship to Everwood
- Encounter weighting
- Related blueprints
- Related Rekindled archetypes
- Future gameplay use

## Rekindled Lore

- `Rekindled — Overview`
- `Rekindled Identity Rules`
- `Rekindled Regional Origins`
- `RekindledBodyA — Common Archer Archetype`
- `Regional Random Archetype`
- `Rarity and Potential`
- `Memories and Keepsakes`
- `Hostile Rekindling Outcomes`

## Canon decisions to record

- Rekindled are people, not worker tokens
- Common residents should often be more immediately useful than rare residents
- Regional origin affects identity, knowledge and blueprint leads
- Generated saved identities must never be silently rewritten
- The Hearth is the settlement's spiritual and physical center
- The long-term fantasy is restoration of home and community

---

# 9. Design Documents to Add

Add the uploaded files to the Game Design library and link cards to them.

## Documents

1. `Game Status — Living Document`
   - Type: Production Reference
   - Status: Active
   - Owner: Project Lead
   - Review cadence: Every major implementation session

2. `Sky and Weather System Plan`
   - Type: Technical Design
   - Status: Approved / Deferred
   - Milestone: World Atmosphere

3. `World Geography and Rekindled Origins`
   - Type: Canonical Lore Design
   - Status: Canon
   - Link to all region and Rekindled entries

4. `Progression System`
   - Type: Gameplay System Design
   - Status: Phase 1 Implemented
   - Link to Phase 2 combat/progression cards

5. `HUD Behavior, Feedback and Notification Plan`
   - Type: UI/UX Design
   - Status: Approved / Deferred
   - Link to all HUD implementation cards

---

# 10. Decisions Board

Create a `Decisions` section with these cards.

## Immediate decisions

### Lock the Final Game Title

Current documents use both:

- Fires of Everwood
- Souls of Everwood

Decision required before store pages, branding, lore headers and export builds.

### Define the Next Playable Milestone

Recommended decision:

`Prototype Stabilization` first, then `Settlement Foundation`.

### Define Bow Prototype Scope

Choose:

- Simple projectile bow first
- Full draw strength, trajectory and ammunition immediately

Recommendation: simple projectile bow first.

### Define Storage Rules

Choose:

- Fixed slots
- Weight-based capacity
- Both slots and weight

Recommendation: fixed slots initially, add weight later only if it improves gameplay.

### Define Equipment Durability Scope

Decide whether:

- All tools degrade
- Weapons and tools degrade
- Armor degrades
- Repair is part of the prototype

### Define Death and Respawn

The progression system is substantial, but the death-loop rules are not yet clearly documented.

### Define Settlement Resident Control

Choose how direct the player control should be:

- Direct task assignment
- Priority-based autonomous work
- Hybrid system

Recommendation: hybrid — assign roles/buildings, let NPCs perform routine work autonomously.

---

# 11. Bugs and Validation Cards to Add Now

Even if no bug is currently visible, these validation cards are necessary because the game now contains many interconnected systems.

## Save and Load Regression

- [ ] Start fresh save
- [ ] Gather all basic resources
- [ ] Craft starter items
- [ ] Build campfire
- [ ] Build Settlement Hearth
- [ ] Rekindle one NPC
- [ ] Change equipment
- [ ] Fill water bottle
- [ ] Save
- [ ] Exit to menu
- [ ] Load
- [ ] Verify player position
- [ ] Verify inventory
- [ ] Verify quickbar
- [ ] Verify equipment
- [ ] Verify vitals
- [ ] Verify world resources
- [ ] Verify buildings
- [ ] Verify Rekindled
- [ ] Verify quest state

## Fresh-Save Critical Path

- [ ] Spawn correctly
- [ ] Find wood
- [ ] Find stone
- [ ] Craft required items
- [ ] Build campfire
- [ ] Recover food and water
- [ ] Understand the next objective
- [ ] No progression blocker

## Performance Baseline

Measure:

- [ ] Clear daytime
- [ ] Night
- [ ] Dense forest
- [ ] Coast
- [ ] Near many berry bushes
- [ ] Near many deposits
- [ ] Near multiple Rekindled
- [ ] Near settlement buildings
- [ ] During loading
- [ ] After 30 minutes of play

Record:

- Average FPS
- 1% low FPS
- CPU frame time
- GPU frame time
- Memory usage
- Object counts

## Interaction Consistency

Test:

- [ ] Trees
- [ ] Logs
- [ ] Stone
- [ ] Soulstone
- [ ] Berry bushes
- [ ] Chickens
- [ ] Campfire
- [ ] Settlement Hearth
- [ ] Rekindled bodies
- [ ] Rekindled residents
- [ ] Water bottle filling
- [ ] Construction sites

---

# 12. Recommended First Two-Week Sprint

Do not begin weather, swimming, fishing or a large combat expansion yet.

## Sprint Goal

Close the obvious prototype gaps and establish the first functional settlement utilities.

## Sprint cards

1. `Add Use Effects to Crafted Consumables`
2. `Add Hearthleaf to World Gathering`
3. `Connect Stone Pickaxe to Tool Gameplay`
4. `Build Workbench Tier I`
5. `Build Wooden Storage Box`
6. `Integrate Core Ambient Audio`
7. `Save and Load Regression`
8. `Fresh-Save Critical Path Test`
9. `Update Game Status Document`
10. `Lock Final Game Title`

## Suggested ownership

For a two-person team:

### Developer A

- Consumable effects
- Stone Pickaxe
- Workbench station logic
- Save/load validation

### Developer B

- Hearthleaf world asset and gathering
- Storage box scene/UI
- Ambient audio integration
- Fresh-save playtest and issue logging

Review each other's cards before moving them to `Done`.

---

# 13. Recommended Development Order

This is the safest route forward:

```text
Prototype Stabilization
→ Settlement Foundation
→ Combat Foundation
→ Narrative and Quest Foundation
→ Core Survival Expansion
→ World Atmosphere
→ Vertical Slice
→ Content Expansion
```

Weather is visually attractive, but it should not be the next major focus. The current game already has many partially connected systems. Closing those loops will create more player value than adding snow, storms or a larger world right now.

Likewise, do not add many new buildings until the Workbench and Storage Box prove that the generic building, station and persistence architecture is reliable.

---

# 14. Definition of Prototype Complete

The prototype is complete when a player can:

- Start a new game
- Move and explore reliably
- Gather wood, stone, food, water, fiber and herbs
- Craft and use survival items
- Equip and use tools
- Build a campfire
- Build a Settlement Hearth
- Build and use storage
- Build and use a workbench
- Rekindle at least one unique resident
- Save and load without losing progress
- Follow a short quest chain
- Understand the next goal
- Experience convincing basic audio and visual feedback

Anything beyond this belongs to the next milestone rather than being allowed to expand the prototype indefinitely.

---

# 15. Import Order for DevelopmentOS

Create content in this order:

1. Add the roadmap milestones.
2. Add the permanent Game Systems board lists.
3. Add all completed system cards.
4. Add all partial and missing feature cards.
5. Add the immediate sprint cards to the Game Development board.
6. Link each implementation card to its system card.
7. Import the five design/reference documents.
8. Create the canonical Lore entries.
9. Create the decisions.
10. Create the validation cards.
11. Assign owners and reviewers.
12. Add the first roadmap update.

## First roadmap update example

**Title:** Prototype Status — July 24, 2026  
**Health:** At Risk  
**Progress:** 65%

**Completed**

- Procedural island world and water
- Core player movement and gathering
- Inventory, quickbar and crafting
- Campfire and Settlement Hearth
- Rekindled prototype
- Progression phase 1
- Save/load foundation

**Current gaps**

- Several craftable items have no gameplay effect
- Workbench and storage are data-only
- Journal and post-campfire quests are missing
- Audio library is only partly integrated
- Equipment bonuses and combat phase 2 are missing

**Next**

- Stabilize consumables and tools
- Add Hearthleaf gathering
- Build Workbench Tier I
- Build Wooden Storage Box
- Integrate core ambient audio
- Run complete save/load regression
