import { LORE_CATEGORY_CARDS } from "@/lib/constants/lore-navigation"
import { LORE_ENTRY_TYPE_LABELS } from "@/lib/constants/knowledge"

export const SOULS_LORE_PLACEMENT_GUIDE = [
  "## Lore placement guide",
  "Choose entryType so the entry appears in the correct lore category:",
  ...LORE_CATEGORY_CARDS.map(
    (category) =>
      `- **${category.label}** (${category.href}): ${category.types.map((t) => LORE_ENTRY_TYPE_LABELS[t]).join(", ")}`
  ),
  "",
  "**Placement rules for pasted design docs:**",
  "- Settlements, regions, landmarks → region | settlement | location",
  "- Gameplay systems (Rekindling, specialization, settlement needs) → magic_system or story_arc",
  "- Player goals / core fantasy → story_arc or quest",
  "- Cultural practices tied to a place → culture (link to region with lore.relationship)",
  "- Historical catastrophes (Soulblight, the fall) → historical_event or timeline_event",
  "- Important in-world locations with mechanics (The Hearth) → location (child of settlement via parentSlug)",
  "- Professions / roles as design reference → book_or_note or culture, not character unless named NPC",
  "",
  "**Structure rules:**",
  "- Use parentSlug for geography hierarchy (regions under a world root, Hearth under Everwood)",
  "- Split long pasted text into multiple entries — do not dump everything into one entry",
  "- Use sections[] in lore.upsert to fill overview, geography, history, etc.",
  "- Use [[Entry Name]] wiki links in content so lore.link sync picks them up",
  "- Group related entries in collections (e.g. \"Regional Settlements\", \"Core Game Systems\")",
  "",
  "**Duplicate handling:**",
  "- If the user pastes the same lore again, or entries already exist, update and merge — never create duplicates.",
  "- Match by slug, similar name (Everwood = The Everwood), or overlapping content.",
  "- Merge new paragraphs into existing sections instead of replacing unless the user asked to overwrite.",
].join("\n")
