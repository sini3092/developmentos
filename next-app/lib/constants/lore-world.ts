import type { LoreMapMarkerType, LoreTimelinePrecision } from "@/lib/database.types"

export const LORE_TIMELINE_PRECISIONS = [
  "exact",
  "approximate",
  "era_only",
  "unknown",
  "range",
] as const satisfies readonly LoreTimelinePrecision[]

export const LORE_TIMELINE_PRECISION_LABELS: Record<LoreTimelinePrecision, string> = {
  exact: "Exact date",
  approximate: "Approximate",
  era_only: "Era only",
  unknown: "Unknown date",
  range: "Date range",
}

export const LORE_MAP_MARKER_TYPES = [
  "settlement",
  "ruin",
  "dungeon",
  "landmark",
  "resource",
  "faction_territory",
  "quest_location",
  "other",
] as const satisfies readonly LoreMapMarkerType[]

export const LORE_MAP_MARKER_LABELS: Record<LoreMapMarkerType, string> = {
  settlement: "Settlement",
  ruin: "Ruin",
  dungeon: "Dungeon",
  landmark: "Landmark",
  resource: "Resource",
  faction_territory: "Faction territory",
  quest_location: "Quest location",
  other: "Other",
}

export const LORE_GEOGRAPHIC_TYPES = ["region", "location", "settlement"] as const
