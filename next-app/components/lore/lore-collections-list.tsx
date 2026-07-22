"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { FolderOpen, Plus, Star } from "lucide-react"

import { createLoreCollection } from "@/lib/actions/lore-world"
import type { LoreCollection } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type LoreCollectionsListProps = {
  slug: string
  projectId: string
  collections: LoreCollection[]
  canEdit: boolean
}

export function LoreCollectionsList({
  slug,
  projectId,
  collections,
  canEdit,
}: LoreCollectionsListProps) {
  const [showForm, setShowForm] = useState(false)
  const [state, action, pending] = useActionState(createLoreCollection, {})

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Collections</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated groups of related lore without changing the core hierarchy.
          </p>
        </div>
        {canEdit ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="size-4" />
            {showForm ? "Cancel" : "New collection"}
          </Button>
        ) : null}
      </div>

      {showForm && canEdit ? (
        <form action={action} className="space-y-3 rounded-xl border border-border/60 bg-card p-4">
          <input type="hidden" name="projectId" value={projectId} />
          <input type="hidden" name="slug" value={slug} />
          <div className="space-y-1">
            <Label htmlFor="collection-name">Name</Label>
            <Input id="collection-name" name="name" placeholder="Main Story Lore" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="collection-desc">Description</Label>
            <Textarea id="collection-desc" name="description" rows={2} />
          </div>
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
          <Button type="submit" size="sm" disabled={pending}>
            Create collection
          </Button>
        </form>
      ) : null}

      {collections.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 p-10 text-center">
          <FolderOpen className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">No collections yet</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/projects/${slug}/lore/collections/${collection.slug}`}
              className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-muted/30"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium">{collection.name}</p>
                {collection.is_featured ? (
                  <Star className="size-4 shrink-0 text-warning" />
                ) : null}
              </div>
              {collection.description ? (
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {collection.description}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
