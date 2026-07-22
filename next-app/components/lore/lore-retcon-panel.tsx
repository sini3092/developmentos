"use client"

import Link from "next/link"
import { useActionState } from "react"
import { AlertTriangle } from "lucide-react"

import { retconLoreEntry } from "@/lib/actions/lore-versioning"
import type { LoreEntry } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type LoreRetconPanelProps = {
  entry: Pick<
    LoreEntry,
    "id" | "slug" | "name" | "canon_status" | "retcon_reason" | "replacement_entry_id"
  >
  slug: string
  otherEntries: Array<Pick<LoreEntry, "id" | "name" | "slug">>
  replacementEntry?: Pick<LoreEntry, "id" | "name" | "slug"> | null
  canEdit: boolean
}

export function LoreRetconPanel({
  entry,
  slug,
  otherEntries,
  replacementEntry,
  canEdit,
}: LoreRetconPanelProps) {
  const [state, formAction, pending] = useActionState(retconLoreEntry, {})

  if (entry.canon_status === "retconned") {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 p-4 shadow-xs">
        <h3 className="flex items-center gap-2 text-sm font-medium text-danger">
          <AlertTriangle className="size-4" />
          Retconned lore
        </h3>
        {entry.retcon_reason ? (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{entry.retcon_reason}</p>
        ) : null}
        {replacementEntry ? (
          <p className="mt-2 text-sm">
            Replaced by{" "}
            <Link
              href={`/projects/${slug}/lore/${replacementEntry.slug}`}
              className="font-medium text-info hover:underline"
            >
              {replacementEntry.name}
            </Link>
          </p>
        ) : null}
      </div>
    )
  }

  if (!canEdit || entry.canon_status !== "canon") {
    return null
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <AlertTriangle className="size-4 text-warning" />
        Retcon workflow
      </h3>
      <p className="mt-2 text-xs text-muted-foreground">
        Mark this canon entry as deliberately replaced. A retcon snapshot is saved to version history.
      </p>
      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="entrySlug" value={entry.slug} />
        <div className="space-y-1">
          <Label htmlFor="retcon-reason" className="text-xs">
            Why is this lore being retconned?
          </Label>
          <Textarea
            id="retcon-reason"
            name="reason"
            rows={3}
            required
            placeholder="The Battle of Hollowmere timeline was revised — this account is no longer accurate."
          />
        </div>
        {otherEntries.length > 0 ? (
          <div className="space-y-1">
            <Label htmlFor="replacement-entry" className="text-xs">
              Replacement entry (optional)
            </Label>
            <select
              id="replacement-entry"
              name="replacementEntryId"
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              defaultValue=""
            >
              <option value="">None</option>
              {otherEntries.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Mark as retconned"}
        </Button>
      </form>
    </div>
  )
}
