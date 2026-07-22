import { LoreChangeSummaryField } from "@/components/lore/lore-change-summary-field"
import {
  LORE_CHANGE_TYPE_HINTS,
  LORE_CHANGE_TYPE_LABELS,
  LORE_CHANGE_TYPES,
} from "@/lib/constants/lore-change-types"
import type { CanonStatus } from "@/lib/database.types"
import { Label } from "@/components/ui/label"

type LoreCanonChangeFieldsProps = {
  canonStatus: CanonStatus
  defaultSummary?: string | null
}

export function LoreCanonChangeFields({ canonStatus, defaultSummary }: LoreCanonChangeFieldsProps) {
  const isCanon = canonStatus === "canon"

  if (!isCanon) {
    return (
      <LoreChangeSummaryField
        defaultValue={defaultSummary}
        hint="Optional summary of what you changed in this save."
      />
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-surface-raised/30 p-3">
      <div className="space-y-2">
        <Label htmlFor="changeType">Change classification</Label>
        <select
          id="changeType"
          name="changeType"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Select minor or major…
          </option>
          {LORE_CHANGE_TYPES.map((type) => (
            <option key={type} value={type}>
              {LORE_CHANGE_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Minor and major changes are tracked in version history for canon entries.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {LORE_CHANGE_TYPES.map((type) => (
          <p key={type} className="rounded-md bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{LORE_CHANGE_TYPE_LABELS[type]}:</span>{" "}
            {LORE_CHANGE_TYPE_HINTS[type]}
          </p>
        ))}
      </div>
      <LoreChangeSummaryField defaultValue={defaultSummary} required />
    </div>
  )
}
