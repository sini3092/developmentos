"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { Map, Plus, X } from "lucide-react"

import {
  addLoreMapMarker,
  createLoreWorldMap,
  removeLoreMapMarker,
} from "@/lib/actions/lore-world"
import type { LoreMapWithMarkers } from "@/lib/auth/lore-world-context"
import type { LoreEntryWithAuthor } from "@/lib/database.types"
import { LORE_MAP_MARKER_LABELS, LORE_MAP_MARKER_TYPES } from "@/lib/constants/lore-world"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type LoreWorldMapViewProps = {
  slug: string
  projectId: string
  maps: LoreMapWithMarkers[]
  entryOptions: LoreEntryWithAuthor[]
  canEdit: boolean
}

export function LoreWorldMapView({
  slug,
  projectId,
  maps,
  entryOptions,
  canEdit,
}: LoreWorldMapViewProps) {
  const [selectedMapId, setSelectedMapId] = useState(maps[0]?.id ?? "")
  const [showMapForm, setShowMapForm] = useState(false)
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null)
  const [mapState, mapAction, mapPending] = useActionState(createLoreWorldMap, {})
  const [markerState, markerAction, markerPending] = useActionState(addLoreMapMarker, {})

  const selectedMap = maps.find((map) => map.id === selectedMapId) ?? maps[0]

  function handleMapClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!canEdit || !selectedMap) {
      return
    }
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    setPendingCoords({
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">World map</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a map image and place markers linked to lore entries.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowMapForm((v) => !v)}>
            <Plus className="size-4" />
            {showMapForm ? "Cancel" : "Add map"}
          </Button>
        ) : null}
      </div>

      {showMapForm && canEdit ? (
        <form action={mapAction} className="grid gap-3 rounded-xl border border-border/60 bg-card p-4 sm:grid-cols-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="slug" value={slug} />
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="map-name">Map name</Label>
            <Input id="map-name" name="name" required placeholder="Northern Continent" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="map-url">Image URL</Label>
            <Input id="map-url" name="imageUrl" required placeholder="https://…" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="map-desc">Description</Label>
            <Input id="map-desc" name="description" />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" name="isPrimary" />
            Set as primary map
          </label>
          {mapState.error ? <p className="text-sm text-danger sm:col-span-2">{mapState.error}</p> : null}
          <Button type="submit" size="sm" disabled={mapPending} className="sm:col-span-2">
            Save map
          </Button>
        </form>
      ) : null}

      {maps.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-10 text-center">
          <Map className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">No world maps yet</p>
        </div>
      ) : (
        <>
          {maps.length > 1 ? (
            <select
              value={selectedMap?.id}
              onChange={(event) => setSelectedMapId(event.target.value)}
              className="h-9 w-full max-w-xs rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              {maps.map((map) => (
                <option key={map.id} value={map.id}>
                  {map.name}
                  {map.is_primary ? " (primary)" : ""}
                </option>
              ))}
            </select>
          ) : null}

          {selectedMap ? (
            <div className="grid gap-6 xl:grid-cols-[1fr_16rem]">
              <div
                className="relative overflow-hidden rounded-xl border border-border/60 bg-muted/20"
                onClick={handleMapClick}
                role={canEdit ? "button" : undefined}
                tabIndex={canEdit ? 0 : undefined}
                onKeyDown={
                  canEdit
                    ? undefined
                    : undefined
                }
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedMap.image_url}
                  alt={selectedMap.name}
                  className="block w-full select-none"
                  draggable={false}
                />
                {selectedMap.markers.map((marker) => (
                  <div
                    key={marker.id}
                    className="absolute -translate-x-1/2 -translate-y-full"
                    style={{ left: `${marker.x_percent}%`, top: `${marker.y_percent}%` }}
                  >
                    {marker.entrySlug ? (
                      <Link
                        href={`/projects/${slug}/lore/${marker.entrySlug}`}
                        className="flex flex-col items-center"
                      >
                        <span className="size-3 rounded-full border-2 border-background bg-primary shadow-sm" />
                        <span className="mt-1 max-w-[8rem] truncate rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium shadow-xs">
                          {marker.label}
                        </span>
                      </Link>
                    ) : (
                      <div className="flex flex-col items-center">
                        <span className="size-3 rounded-full border-2 border-background bg-primary shadow-sm" />
                        <span className="mt-1 max-w-[8rem] truncate rounded bg-background/90 px-1.5 py-0.5 text-[10px] font-medium shadow-xs">
                          {marker.label}
                        </span>
                      </div>
                    )}
                    {canEdit ? (
                      <MarkerRemoveForm markerId={marker.id} slug={slug} />
                    ) : null}
                  </div>
                ))}
                {pendingCoords ? (
                  <span
                    className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-background bg-warning"
                    style={{ left: `${pendingCoords.x}%`, top: `${pendingCoords.y}%` }}
                  />
                ) : null}
              </div>

              <aside className="space-y-4">
                {canEdit && pendingCoords ? (
                  <form action={markerAction} className="space-y-3 rounded-xl border border-border/60 p-3">
                    <input type="hidden" name="mapId" value={selectedMap.id} />
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="xPercent" value={pendingCoords.x} />
                    <input type="hidden" name="yPercent" value={pendingCoords.y} />
                    <p className="text-xs text-muted-foreground">
                      New marker at {pendingCoords.x}%, {pendingCoords.y}%
                    </p>
                    <div className="space-y-1">
                      <Label>Label</Label>
                      <Input name="label" required placeholder="Everwood Forest" />
                    </div>
                    <div className="space-y-1">
                      <Label>Type</Label>
                      <select
                        name="markerType"
                        className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                        defaultValue="landmark"
                      >
                        {LORE_MAP_MARKER_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {LORE_MAP_MARKER_LABELS[type]}
                          </option>
                        ))}
                      </select>
                    </div>
                    {entryOptions.length > 0 ? (
                      <div className="space-y-1">
                        <Label>Link entry (optional)</Label>
                        <select
                          name="entryId"
                          className="h-9 w-full rounded-lg border border-input bg-background px-2 text-sm"
                          defaultValue=""
                        >
                          <option value="">None</option>
                          {entryOptions.map((entry) => (
                            <option key={entry.id} value={entry.id}>
                              {entry.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                    {markerState.error ? <p className="text-xs text-danger">{markerState.error}</p> : null}
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" disabled={markerPending}>
                        Add marker
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setPendingCoords(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {canEdit
                      ? "Click the map to place a new marker."
                      : "Markers on this world map."}
                  </p>
                )}

                <ul className="space-y-2 text-sm">
                  {selectedMap.markers.map((marker) => (
                    <li key={marker.id} className="rounded-lg border border-border/50 px-3 py-2">
                      <p className="font-medium">{marker.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {LORE_MAP_MARKER_LABELS[marker.marker_type]}
                      </p>
                      {marker.entrySlug ? (
                        <Link
                          href={`/projects/${slug}/lore/${marker.entrySlug}`}
                          className="text-xs text-info hover:underline"
                        >
                          {marker.entryName}
                        </Link>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}

function MarkerRemoveForm({ markerId, slug }: { markerId: string; slug: string }) {
  const [, removeAction, removePending] = useActionState(removeLoreMapMarker, {})

  return (
    <form action={removeAction} className="mt-1 flex justify-center">
      <input type="hidden" name="markerId" value={markerId} />
      <input type="hidden" name="slug" value={slug} />
      <Button type="submit" size="icon-sm" variant="ghost" disabled={removePending}>
        <X className="size-3" />
      </Button>
    </form>
  )
}
