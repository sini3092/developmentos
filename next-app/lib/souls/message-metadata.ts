import type { Json } from "@/lib/database.types"

export type SoulsActionResult = {
  tool: string
  label: string
  status: "success" | "error"
  href?: string
  summary?: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  error?: string
}

export type SoulsMessageMetadata = {
  actions?: SoulsActionResult[]
  workingLabel?: string
  attachedLore?: {
    name: string
    slug: string
    entryType: string
    summary?: string | null
    contentPreview?: string
  }
}

export function parseSoulsMessageMetadata(metadata: Json | null): SoulsMessageMetadata {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {}
  }
  return metadata as SoulsMessageMetadata
}
