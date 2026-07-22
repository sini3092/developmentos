import type { LoreChangeType } from "@/lib/database.types"

export const LORE_CHANGE_TYPES = ["minor", "major"] as const satisfies readonly LoreChangeType[]

export type EditableLoreChangeType = (typeof LORE_CHANGE_TYPES)[number]

export const LORE_CHANGE_TYPE_LABELS: Record<LoreChangeType, string> = {
  minor: "Minor",
  major: "Major",
  retcon: "Retcon",
}

export const LORE_CHANGE_TYPE_HINTS: Record<EditableLoreChangeType, string> = {
  minor: "Spelling, formatting, clearer wording, or small non-conflicting detail.",
  major: "Identity, relationships, history, motivations, or world rules changed.",
}
