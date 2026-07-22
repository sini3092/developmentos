"use client"

import { useActionState } from "react"

import { updateLoreTimelineFields } from "@/lib/actions/lore-world"
import type { LoreEra } from "@/lib/database.types"
import { LORE_TIMELINE_PRECISIONS, LORE_TIMELINE_PRECISION_LABELS } from "@/lib/constants/lore-world"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type LoreTimelineFieldsPanelProps = {
  entry: {
    id: string
    slug: string
    entry_type: string
    timeline_label: string | null
    timeline_end_label: string | null
    timeline_sort_order: number | null
    timeline_era_id: string | null
    timeline_precision: string
    parent_entry_id: string | null
  }
  slug: string
  eras: LoreEra[]
  parentOptions: Array<{ id: string; name: string }>
  canEdit: boolean
}

export function LoreTimelineFieldsPanel({
  entry,
  slug,
  eras,
  parentOptions,
  canEdit,
}: LoreTimelineFieldsPanelProps) {
  const isEvent =
    entry.entry_type === "historical_event" || entry.entry_type === "timeline_event"
  const isGeographic = ["region", "location", "settlement"].includes(entry.entry_type)

  if (!isEvent && !isGeographic) {
    return null
  }

  const [state, action, pending] = useActionState(updateLoreTimelineFields, {})

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="text-sm font-medium">{isEvent ? "Timeline" : "Geography"}</h3>
      <form action={action} className="mt-3 space-y-3">
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="entrySlug" value={entry.slug} />

        {isEvent ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="timelineLabel">Date label</Label>
              <Input
                id="timelineLabel"
                name="timelineLabel"
                defaultValue={entry.timeline_label ?? ""}
                placeholder="340 Before Rekindling"
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="timelineEndLabel">End label (ranges)</Label>
              <Input
                id="timelineEndLabel"
                name="timelineEndLabel"
                defaultValue={entry.timeline_end_label ?? ""}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="timelineSortOrder">Sort order</Label>
              <Input
                id="timelineSortOrder"
                name="timelineSortOrder"
                type="number"
                defaultValue={entry.timeline_sort_order ?? ""}
                disabled={!canEdit}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="timelineEraId">Era</Label>
              <select
                id="timelineEraId"
                name="timelineEraId"
                defaultValue={entry.timeline_era_id ?? ""}
                disabled={!canEdit}
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="">None</option>
                {eras.map((era) => (
                  <option key={era.id} value={era.id}>
                    {era.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="timelinePrecision">Precision</Label>
              <select
                id="timelinePrecision"
                name="timelinePrecision"
                defaultValue={entry.timeline_precision}
                disabled={!canEdit}
                className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                {LORE_TIMELINE_PRECISIONS.map((precision) => (
                  <option key={precision} value={precision}>
                    {LORE_TIMELINE_PRECISION_LABELS[precision]}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}

        {isGeographic && parentOptions.length > 0 ? (
          <div className="space-y-1">
            <Label htmlFor="parentEntryId">Parent location</Label>
            <select
              id="parentEntryId"
              name="parentEntryId"
              defaultValue={entry.parent_entry_id ?? ""}
              disabled={!canEdit}
              className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="">None (root)</option>
              {parentOptions
                .filter((option) => option.id !== entry.id)
                .map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
            </select>
          </div>
        ) : (
          <input type="hidden" name="parentEntryId" value={entry.parent_entry_id ?? ""} />
        )}

        {!isEvent ? (
          <>
            <input type="hidden" name="timelineLabel" value={entry.timeline_label ?? ""} />
            <input type="hidden" name="timelineEndLabel" value={entry.timeline_end_label ?? ""} />
            <input type="hidden" name="timelineSortOrder" value={entry.timeline_sort_order ?? ""} />
            <input type="hidden" name="timelineEraId" value={entry.timeline_era_id ?? ""} />
            <input type="hidden" name="timelinePrecision" value={entry.timeline_precision} />
          </>
        ) : (
          <input type="hidden" name="parentEntryId" value={entry.parent_entry_id ?? ""} />
        )}

        {canEdit ? (
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Save
          </Button>
        ) : null}
        {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
        {state.success ? <p className="text-xs text-success">{state.success}</p> : null}
      </form>
    </div>
  )
}
