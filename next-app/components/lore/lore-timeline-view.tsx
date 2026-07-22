"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { Calendar, Plus } from "lucide-react"

import { createLoreEra } from "@/lib/actions/lore-world"
import type { LoreTimelineEntry } from "@/lib/auth/lore-world-context"
import type { LoreEra } from "@/lib/database.types"
import { LORE_TIMELINE_PRECISION_LABELS } from "@/lib/constants/lore-world"
import { CANON_STATUS_LABELS } from "@/lib/constants/knowledge"
import { LoreCanonBadge } from "@/components/lore/lore-badges"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useActionState } from "react"

type LoreTimelineViewProps = {
  slug: string
  projectId: string
  events: LoreTimelineEntry[]
  eras: LoreEra[]
  canEdit: boolean
}

export function LoreTimelineView({
  slug,
  projectId,
  events,
  eras,
  canEdit,
}: LoreTimelineViewProps) {
  const [eraFilter, setEraFilter] = useState<string>("all")
  const [canonFilter, setCanonFilter] = useState<string>("all")
  const [showEraForm, setShowEraForm] = useState(false)
  const [eraState, eraAction, eraPending] = useActionState(createLoreEra, {})

  const filtered = useMemo(() => {
    return events.filter((event) => {
      if (eraFilter !== "all" && event.timeline_era_id !== eraFilter) {
        return false
      }
      if (canonFilter !== "all" && event.canon_status !== canonFilter) {
        return false
      }
      return true
    })
  }, [events, eraFilter, canonFilter])

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Timeline</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Historical events in chronological order.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowEraForm((v) => !v)}>
            <Plus className="size-4" />
            {showEraForm ? "Cancel era" : "Add era"}
          </Button>
        ) : null}
      </div>

      {showEraForm && canEdit ? (
        <form action={eraAction} className="grid gap-3 rounded-xl border border-border/60 bg-card p-4 sm:grid-cols-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="slug" value={slug} />
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="era-name">Era name</Label>
            <Input id="era-name" name="name" placeholder="After Rekindling" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="era-short">Short label</Label>
            <Input id="era-short" name="shortLabel" placeholder="AR" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="era-sort">Sort order</Label>
            <Input id="era-sort" name="sortOrder" type="number" defaultValue={0} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="era-desc">Description</Label>
            <Input id="era-desc" name="description" placeholder="The age after the Great Rekindling" />
          </div>
          {eraState.error ? <p className="text-sm text-danger sm:col-span-2">{eraState.error}</p> : null}
          {eraState.success ? <p className="text-sm text-success sm:col-span-2">{eraState.success}</p> : null}
          <div className="sm:col-span-2">
            <Button type="submit" size="sm" disabled={eraPending}>
              Create era
            </Button>
          </div>
        </form>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <label className="space-y-1 text-xs">
          <span className="font-medium text-muted-foreground">Era</span>
          <select
            value={eraFilter}
            onChange={(event) => setEraFilter(event.target.value)}
            className="h-8 min-w-[10rem] rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="all">All eras</option>
            {eras.map((era) => (
              <option key={era.id} value={era.id}>
                {era.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs">
          <span className="font-medium text-muted-foreground">Canon</span>
          <select
            value={canonFilter}
            onChange={(event) => setCanonFilter(event.target.value)}
            className="h-8 min-w-[10rem] rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="all">All statuses</option>
            {Object.entries(CANON_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-10 text-center">
          <Calendar className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">No timeline events yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Create historical event or timeline event entries, then set their dates on each entry.
          </p>
        </div>
      ) : (
        <ol className="relative space-y-0 border-l border-border/60 pl-6">
          {filtered.map((event) => (
            <li key={event.id} className="relative pb-8 last:pb-0">
              <span className="absolute -left-[0.4rem] top-1.5 size-2.5 rounded-full border-2 border-background bg-primary" />
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {event.timeline_label ||
                    event.era?.name ||
                    LORE_TIMELINE_PRECISION_LABELS[event.timeline_precision]}
                  {event.timeline_end_label ? ` — ${event.timeline_end_label}` : null}
                </p>
                <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <Link
                      href={`/projects/${slug}/lore/${event.slug}`}
                      className="font-serif text-lg font-semibold hover:text-info"
                    >
                      {event.name}
                    </Link>
                    <LoreCanonBadge status={event.canon_status} />
                  </div>
                  {event.summary ? (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{event.summary}</p>
                  ) : null}
                  {event.locationName ? (
                    <p className="mt-2 text-xs text-muted-foreground">Location: {event.locationName}</p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
