import type { AssetStatus, AssetType } from "@/lib/database.types"

export const ASSET_TYPES: AssetType[] = [
  "mesh",
  "texture",
  "material",
  "sprite",
  "animation",
  "audio",
  "vfx",
  "ui",
  "level",
  "prefab",
  "script",
  "other",
]

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  mesh: "Mesh",
  texture: "Texture",
  material: "Material",
  sprite: "Sprite",
  animation: "Animation",
  audio: "Audio",
  vfx: "VFX",
  ui: "UI",
  level: "Level",
  prefab: "Prefab",
  script: "Script",
  other: "Other",
}

export const ASSET_STATUSES: AssetStatus[] = [
  "concept",
  "wip",
  "in_review",
  "approved",
  "deprecated",
  "archived",
]

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  concept: "Concept",
  wip: "Work in Progress",
  in_review: "In Review",
  approved: "Approved",
  deprecated: "Deprecated",
  archived: "Archived",
}
