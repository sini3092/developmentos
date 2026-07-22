"use client"

import { useState } from "react"
import { Link2 } from "lucide-react"

import type { LoreEntry } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type LoreLinkInserterProps = {
  entries: Array<Pick<LoreEntry, "id" | "name" | "slug">>
  onInsert: (snippet: string) => void
}

export function LoreLinkInserter({ entries, onInsert }: LoreLinkInserterProps) {
  const [entryId, setEntryId] = useState("")

  function handleInsert() {
    const entry = entries.find((item) => item.id === entryId)
    if (!entry) return
    onInsert(`[[${entry.name}|${entry.slug}]]`)
    setEntryId("")
  }

  if (entries.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-border/60 bg-surface-raised/40 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Link2 className="size-4" />
        Insert lore link
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Adds a wiki link like [[Character Name|slug]] to your content.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="lore-link-target" className="text-xs">
            Lore entry
          </Label>
          <select
            id="lore-link-target"
            value={entryId}
            onChange={(event) => setEntryId(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="">Select entry…</option>
            {entries.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" size="sm" variant="outline" disabled={!entryId} onClick={handleInsert}>
          Insert link
        </Button>
      </div>
    </div>
  )
}
