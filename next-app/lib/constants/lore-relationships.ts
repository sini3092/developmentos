import type { LoreRelationshipType } from "@/lib/database.types"

export const LORE_RELATIONSHIP_TYPES: LoreRelationshipType[] = [
  "related_to",
  "parent_of",
  "member_of",
  "located_in",
  "ally_of",
  "enemy_of",
]

export const LORE_RELATIONSHIP_LABELS: Record<LoreRelationshipType, string> = {
  related_to: "Related to",
  parent_of: "Parent of",
  member_of: "Member of",
  located_in: "Located in",
  ally_of: "Ally of",
  enemy_of: "Enemy of",
}
