"use client"

import Link from "next/link"
import { useActionState } from "react"
import { GitBranch } from "lucide-react"

import { addLoreRelationship, removeLoreRelationship } from "@/lib/actions/knowledge"
import type { LoreEntry, ResolvedLoreRelationship } from "@/lib/database.types"
import {
  LORE_RELATIONSHIP_LABELS,
  LORE_RELATIONSHIP_TYPES,
} from "@/lib/constants/lore-relationships"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type LoreRelationshipsPanelProps = {
  slug: string
  entryId: string
  entrySlug: string
  relationships: ResolvedLoreRelationship[]
  otherEntries: Array<Pick<LoreEntry, "id" | "name" | "slug">>
  canEdit: boolean
}

export function LoreRelationshipsPanel({
  slug,
  entryId,
  entrySlug,
  relationships,
  otherEntries,
  canEdit,
}: LoreRelationshipsPanelProps) {
  const [addState, addAction, adding] = useActionState(addLoreRelationship, {})
  const [, removeAction] = useActionState(removeLoreRelationship, {})
  const linkedIds = new Set([
    entryId,
    ...relationships.map((relationship) => relationship.target_entry_id),
  ])
  const availableEntries = otherEntries.filter((entry) => !linkedIds.has(entry.id))

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <GitBranch className="size-4" />
        Relationships
      </h3>
      {relationships.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No linked lore entries yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {relationships.map((relationship) => (
            <li
              key={relationship.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {LORE_RELATIONSHIP_LABELS[relationship.relationship_type]}
                </p>
                <Link
                  href={`/projects/${slug}/lore/${relationship.target_slug}`}
                  className="font-medium hover:underline"
                >
                  {relationship.target_name}
                </Link>
                {relationship.label ? (
                  <p className="text-xs text-muted-foreground">{relationship.label}</p>
                ) : null}
              </div>
              {canEdit ? (
                <form action={removeAction}>
                  <input type="hidden" name="relationshipId" value={relationship.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="entrySlug" value={entrySlug} />
                  <Button type="submit" size="sm" variant="ghost" className="h-7 px-2 text-xs">
                    Remove
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit && availableEntries.length > 0 ? (
        <form action={addAction} className="mt-4 space-y-3 border-t border-border/50 pt-4">
          <input type="hidden" name="sourceEntryId" value={entryId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="entrySlug" value={entrySlug} />
          {addState.error ? <p className="text-sm text-danger">{addState.error}</p> : null}
          {addState.success ? <p className="text-sm text-success">{addState.success}</p> : null}
          <div className="space-y-2">
            <Label htmlFor="relationshipType">Relationship</Label>
            <select
              id="relationshipType"
              name="relationshipType"
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              {LORE_RELATIONSHIP_TYPES.map((type) => (
                <option key={type} value={type}>
                  {LORE_RELATIONSHIP_LABELS[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="targetEntryId">Lore entry</Label>
            <select
              id="targetEntryId"
              name="targetEntryId"
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              required
            >
              <option value="">Select entry…</option>
              {availableEntries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Note (optional)</Label>
            <Input id="label" name="label" placeholder="e.g. sworn protector" />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={adding}>
            {adding ? "Linking…" : "Add relationship"}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
