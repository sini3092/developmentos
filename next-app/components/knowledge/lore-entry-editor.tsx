"use client"

import Link from "next/link"
import { useActionState } from "react"
import { ArrowLeft } from "lucide-react"

import { LoreVersionsPanel } from "@/components/knowledge/document-versions-panel"
import { LoreRelationshipsPanel } from "@/components/knowledge/lore-relationships-panel"
import { RichTextContent } from "@/components/knowledge/rich-text-content"
import { RichTextEditor } from "@/components/knowledge/rich-text-editor"
import { updateLoreEntry } from "@/lib/actions/knowledge"
import type { LoreEntry, LoreEntryDetail } from "@/lib/database.types"
import {
  CANON_STATUSES,
  CANON_STATUS_LABELS,
  LORE_ENTRY_TYPES,
  LORE_ENTRY_TYPE_LABELS,
} from "@/lib/constants/knowledge"
import { getInitialEditorDoc } from "@/lib/utils/tiptap"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type LoreEntryEditorProps = {
  entry: LoreEntryDetail
  slug: string
  otherEntries: Array<Pick<LoreEntry, "id" | "name" | "slug">>
  canEdit: boolean
}

export function LoreEntryEditor({ entry, slug, otherEntries, canEdit }: LoreEntryEditorProps) {
  const [state, formAction, pending] = useActionState(updateLoreEntry, {})
  const initialDoc = getInitialEditorDoc(entry.content, entry.content_json, entry.content_format)

  if (!canEdit) {
    return (
      <div className="grid flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <article className="rounded-xl border border-border/60 bg-card p-6 shadow-xs">
          <RichTextContent
            content={entry.content}
            contentJson={entry.content_json}
            contentFormat={entry.content_format}
          />
        </article>
        <aside className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
            <h3 className="text-sm font-medium">Details</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{LORE_ENTRY_TYPE_LABELS[entry.entry_type]}</Badge>
              <Badge variant="secondary">{CANON_STATUS_LABELS[entry.canon_status]}</Badge>
            </div>
            {entry.summary ? (
              <p className="mt-3 text-sm text-muted-foreground">{entry.summary}</p>
            ) : null}
          </div>
          <LoreRelationshipsPanel
            slug={slug}
            entryId={entry.id}
            entrySlug={entry.slug}
            relationships={entry.relationships}
            otherEntries={otherEntries}
            canEdit={false}
          />
          <LoreVersionsPanel
            slug={slug}
            entrySlug={entry.slug}
            entryId={entry.id}
            versions={entry.versions}
            canEdit={false}
          />
        </aside>
      </div>
    )
  }

  return (
    <div className="grid flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="entryId" value={entry.id} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="entrySlug" value={entry.slug} />
        {state.error ? (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
            {state.success}
          </p>
        ) : null}
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" defaultValue={entry.name} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea id="summary" name="summary" rows={2} defaultValue={entry.summary ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="entryType">Type</Label>
          <select
            id="entryType"
            name="entryType"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue={entry.entry_type}
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
            defaultValue={entry.canon_status}
          >
            {CANON_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CANON_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Content</Label>
          <RichTextEditor name="contentJson" initialDoc={initialDoc} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save entry"}
        </Button>
      </form>
      <aside className="space-y-4">
        <LoreRelationshipsPanel
          slug={slug}
          entryId={entry.id}
          entrySlug={entry.slug}
          relationships={entry.relationships}
          otherEntries={otherEntries}
          canEdit
        />
        <LoreVersionsPanel
          slug={slug}
          entrySlug={entry.slug}
          entryId={entry.id}
          versions={entry.versions}
          canEdit
        />
      </aside>
    </div>
  )
}

export function LoreEntryHeader({
  slug,
  entrySlug,
}: {
  slug: string
  entrySlug?: string
}) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={entrySlug ? `/projects/${slug}/lore/${entrySlug}` : `/projects/${slug}/lore`}>
        <ArrowLeft className="size-4" />
        {entrySlug ? "Back to entry" : "Back to lore"}
      </Link>
    </Button>
  )
}
