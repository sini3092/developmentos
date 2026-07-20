"use client"

import Link from "next/link"
import { useActionState, useEffect, useState } from "react"
import { Network, Plus, ScrollText, Sparkles } from "lucide-react"

import { createLoreEntry, seedStarterLoreEntries } from "@/lib/actions/knowledge"
import type { LoreEntryWithAuthor } from "@/lib/database.types"
import {
  CANON_STATUSES,
  CANON_STATUS_LABELS,
  LORE_ENTRY_TYPES,
  LORE_ENTRY_TYPE_LABELS,
} from "@/lib/constants/knowledge"
import { slugify } from "@/lib/utils/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type LoreLibraryProps = {
  workspaceId: string
  projectId: string
  slug: string
  entries: LoreEntryWithAuthor[]
  canEdit: boolean
}

function CreateLoreEntryForm({
  workspaceId,
  projectId,
  slug,
  onSuccess,
}: {
  workspaceId: string
  projectId: string
  slug: string
  onSuccess?: () => void
}) {
  const [state, formAction, pending] = useActionState(createLoreEntry, {})
  const [name, setName] = useState("")
  const [entrySlug, setEntrySlug] = useState("")

  useEffect(() => {
    if (state.success) {
      onSuccess?.()
    }
  }, [state.success, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="slug" value={slug} />
      {state.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            if (!entrySlug) {
              setEntrySlug(slugify(event.target.value))
            }
          }}
          placeholder="The Northern Kingdoms"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="entrySlug">Slug</Label>
        <Input
          id="entrySlug"
          name="entrySlug"
          value={entrySlug}
          onChange={(event) => setEntrySlug(slugify(event.target.value))}
          placeholder="northern-kingdoms"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="entryType">Type</Label>
          <select
            id="entryType"
            name="entryType"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue="other"
          >
            {LORE_ENTRY_TYPES.map((entryType) => (
              <option key={entryType} value={entryType}>
                {LORE_ENTRY_TYPE_LABELS[entryType]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="canonStatus">Canon status</Label>
          <select
            id="canonStatus"
            name="canonStatus"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue="draft"
          >
            {CANON_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CANON_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea id="summary" name="summary" rows={2} placeholder="Brief overview." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          name="content"
          rows={6}
          placeholder="# Name&#10;&#10;Lore content in markdown."
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create entry"}
      </Button>
    </form>
  )
}

export function LoreLibrary({
  workspaceId,
  projectId,
  slug,
  entries,
  canEdit,
}: LoreLibraryProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)

  async function handleSeed() {
    setSeeding(true)
    await seedStarterLoreEntries(projectId, slug)
    setSeeding(false)
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {entries.length} lore entr{entries.length === 1 ? "y" : "ies"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {entries.length > 0 ? (
            <Button variant="outline" asChild>
              <Link href={`/projects/${slug}/lore/graph`}>
                <Network className="size-4" />
                Graph view
              </Link>
            </Button>
          ) : null}
          {canEdit ? (
            <>
            {entries.length === 0 ? (
              <Button variant="outline" onClick={handleSeed} disabled={seeding}>
                <Sparkles className="size-4" />
                {seeding ? "Seeding…" : "Seed starters"}
              </Button>
            ) : null}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  New entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create lore entry</DialogTitle>
                </DialogHeader>
                <CreateLoreEntryForm
                  workspaceId={workspaceId}
                  projectId={projectId}
                  slug={slug}
                  onSuccess={() => setCreateOpen(false)}
                />
              </DialogContent>
            </Dialog>
            </>
          ) : null}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-10 text-center">
          <ScrollText className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 text-sm font-medium">No lore entries yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Build your world bible with characters, locations, factions, and more.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/projects/${slug}/lore/${entry.slug}`}
              className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{entry.name}</h3>
                  {entry.summary ? (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {entry.summary}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{LORE_ENTRY_TYPE_LABELS[entry.entry_type]}</Badge>
                  <Badge variant="secondary">{CANON_STATUS_LABELS[entry.canon_status]}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
