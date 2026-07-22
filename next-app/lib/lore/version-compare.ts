import type { LoreEntry, LoreEntryVersion } from "@/lib/database.types"
import { LORE_ENTRY_TYPE_LABELS } from "@/lib/constants/knowledge"
import { CANON_STATUS_LABELS } from "@/lib/constants/knowledge"
import { buildUnifiedDiff } from "@/lib/utils/text-diff"

export type LoreVersionFieldChange = {
  field: string
  label: string
  before: string
  after: string
}

export type LoreVersionComparison = {
  fieldChanges: LoreVersionFieldChange[]
  summaryDiff: ReturnType<typeof buildUnifiedDiff> | null
  contentDiff: ReturnType<typeof buildUnifiedDiff>
}

type ComparableLoreSnapshot = Pick<
  LoreEntryVersion,
  "name" | "summary" | "content" | "entry_type" | "canon_status" | "change_summary"
>

function snapshotFromEntry(entry: Pick<LoreEntry, "name" | "summary" | "content" | "entry_type" | "canon_status" | "change_summary">): ComparableLoreSnapshot {
  return {
    name: entry.name,
    summary: entry.summary,
    content: entry.content,
    entry_type: entry.entry_type,
    canon_status: entry.canon_status,
    change_summary: entry.change_summary,
  }
}

function fieldChange(
  field: string,
  label: string,
  before: string | null | undefined,
  after: string | null | undefined
): LoreVersionFieldChange | null {
  const left = (before ?? "").trim()
  const right = (after ?? "").trim()
  if (left === right) {
    return null
  }

  return { field, label, before: left || "—", after: right || "—" }
}

export function compareLoreSnapshots(
  before: ComparableLoreSnapshot,
  after: ComparableLoreSnapshot,
  path = "content"
): LoreVersionComparison {
  const fieldChanges = [
    fieldChange("name", "Name", before.name, after.name),
    fieldChange("summary", "Summary", before.summary, after.summary),
    fieldChange(
      "entry_type",
      "Type",
      LORE_ENTRY_TYPE_LABELS[before.entry_type],
      LORE_ENTRY_TYPE_LABELS[after.entry_type]
    ),
    fieldChange(
      "canon_status",
      "Canon status",
      CANON_STATUS_LABELS[before.canon_status],
      CANON_STATUS_LABELS[after.canon_status]
    ),
    fieldChange("change_summary", "Change summary", before.change_summary, after.change_summary),
  ].filter((change): change is LoreVersionFieldChange => change !== null)

  const summaryDiff =
    (before.summary ?? "").trim() === (after.summary ?? "").trim()
      ? null
      : buildUnifiedDiff(before.summary ?? "", after.summary ?? "", "summary.md", 16)

  const contentDiff = buildUnifiedDiff(before.content ?? "", after.content ?? "", path, 40)

  return { fieldChanges, summaryDiff, contentDiff }
}

export function compareLoreVersionToEntry(version: LoreEntryVersion, entry: LoreEntry) {
  return compareLoreSnapshots(version, snapshotFromEntry(entry), `${entry.slug}.md`)
}

export function compareLoreVersions(before: LoreEntryVersion, after: LoreEntryVersion) {
  return compareLoreSnapshots(before, after, `v${before.version_number}-to-v${after.version_number}.md`)
}
