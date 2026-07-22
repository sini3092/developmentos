"use client"

import Link from "next/link"
import { useActionState } from "react"
import { ChevronRight, X } from "lucide-react"

import {
  addLoreCollectionEntry,
  removeLoreCollectionEntry,
} from "@/lib/actions/lore-world"
import type { LoreCollectionWithEntries } from "@/lib/auth/lore-world-context"
import type { LoreEntryWithAuthor } from "@/lib/database.types"
import { LoreCanonBadge, LoreTypeBadge } from "@/components/lore/lore-badges"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type LoreCollectionDetailProps = {
  slug: string
  collection: LoreCollectionWithEntries
  availableEntries: LoreEntryWithAuthor[]
  canEdit: boolean
}

export function LoreCollectionDetail({
  slug,
  collection,
  availableEntries,
  canEdit,
}: LoreCollectionDetailProps) {
  const [addState, addAction, addPending] = useActionState(addLoreCollectionEntry, {})

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        <Link href={`/projects/${slug}/lore`} className="hover:text-foreground">
          Lore
        </Link>
        <ChevronRight className="size-3.5" />
        <Link href={`/projects/${slug}/lore/collections`} className="hover:text-foreground">
          Collections
        </Link>
        <ChevronRight className="size-3.5" />
        <span className="text-foreground">{collection.name}</span>
      </nav>

      <header className="space-y-2">
        <h1 className="font-serif text-3xl font-semibold tracking-tight">{collection.name}</h1>
        {collection.description ? (
          <p className="max-w-2xl text-muted-foreground">{collection.description}</p>
        ) : null}
        <p className="text-sm text-muted-foreground">
          {collection.entryCount} entr{collection.entryCount === 1 ? "y" : "ies"}
        </p>
      </header>

      {canEdit && availableEntries.length > 0 ? (
        <form action={addAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="collectionId" value={collection.id} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="collectionSlug" value={collection.slug} />
          <div className="min-w-0 flex-1 space-y-1">
            <Label>Add entry</Label>
            <select
              name="entryId"
              required
              className="h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              defaultValue=""
            >
              <option value="" disabled>
                Select entry…
              </option>
              {availableEntries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={addPending}>
            Add
          </Button>
          {addState.error ? <p className="w-full text-xs text-danger">{addState.error}</p> : null}
        </form>
      ) : null}

      {collection.entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No entries in this collection yet.</p>
      ) : (
        <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
          {collection.entries.map(({ entry, linkId }) => (
            <CollectionEntryRow
              key={entry.id}
              entry={entry}
              slug={slug}
              collectionSlug={collection.slug}
              linkId={linkId}
              canEdit={canEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CollectionEntryRow({
  entry,
  slug,
  collectionSlug,
  linkId,
  canEdit,
}: {
  entry: LoreEntryWithAuthor
  slug: string
  collectionSlug: string
  linkId: string
  canEdit: boolean
}) {
  const [, removeAction, removePending] = useActionState(removeLoreCollectionEntry, {})

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <Link
          href={`/projects/${slug}/lore/${entry.slug}`}
          className="font-medium hover:text-info"
        >
          {entry.name}
        </Link>
        <div className="mt-1 flex flex-wrap gap-2">
          <LoreTypeBadge type={entry.entry_type} />
          <LoreCanonBadge status={entry.canon_status} />
        </div>
      </div>
      {canEdit ? (
        <form action={removeAction}>
          <input type="hidden" name="linkId" value={linkId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="collectionSlug" value={collectionSlug} />
          <Button type="submit" size="icon-sm" variant="ghost" disabled={removePending}>
            <X className="size-3.5" />
          </Button>
        </form>
      ) : null}
    </div>
  )
}
