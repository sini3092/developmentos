"use client"

import Link from "next/link"
import { useActionState } from "react"
import { ArrowLeft } from "lucide-react"

import { DocumentVersionsPanel } from "@/components/knowledge/document-versions-panel"
import { RichTextContent } from "@/components/knowledge/rich-text-content"
import { RichTextEditor } from "@/components/knowledge/rich-text-editor"
import { updateDesignDocument } from "@/lib/actions/knowledge"
import type { DesignDocumentDetail } from "@/lib/database.types"
import {
  DESIGN_CATEGORIES,
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABELS,
} from "@/lib/constants/knowledge"
import { getInitialEditorDoc } from "@/lib/utils/tiptap"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type DesignDocumentEditorProps = {
  document: DesignDocumentDetail
  slug: string
  canEdit: boolean
}

export function DesignDocumentEditor({ document, slug, canEdit }: DesignDocumentEditorProps) {
  const [state, formAction, pending] = useActionState(updateDesignDocument, {})
  const initialDoc = getInitialEditorDoc(
    document.content,
    document.content_json,
    document.content_format
  )

  const categoryLabel =
    DESIGN_CATEGORIES.find((category) => category.id === document.category)?.label ??
    document.category

  if (!canEdit) {
    return (
      <div className="grid flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <article className="rounded-xl border border-border/60 bg-card p-6 shadow-xs">
          <RichTextContent
            content={document.content}
            contentJson={document.content_json}
            contentFormat={document.content_format}
          />
        </article>
        <aside className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
            <h3 className="text-sm font-medium">Details</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{categoryLabel}</Badge>
              <Badge variant="secondary">{DOCUMENT_STATUS_LABELS[document.status]}</Badge>
            </div>
            {document.summary ? (
              <p className="mt-3 text-sm text-muted-foreground">{document.summary}</p>
            ) : null}
          </div>
          <DocumentVersionsPanel
            slug={slug}
            docSlug={document.slug}
            documentId={document.id}
            versions={document.versions}
            canEdit={false}
          />
        </aside>
      </div>
    )
  }

  return (
    <div className="grid flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="documentId" value={document.id} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="docSlug" value={document.slug} />
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
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={document.title} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="summary">Summary</Label>
          <Textarea id="summary" name="summary" rows={2} defaultValue={document.summary ?? ""} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              name="category"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue={document.category}
            >
              {DESIGN_CATEGORIES.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              defaultValue={document.status}
            >
              {DOCUMENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {DOCUMENT_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Content</Label>
          <RichTextEditor name="contentJson" initialDoc={initialDoc} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save document"}
        </Button>
      </form>
      <aside className="space-y-4">
        <DocumentVersionsPanel
          slug={slug}
          docSlug={document.slug}
          documentId={document.id}
          versions={document.versions}
          canEdit
        />
      </aside>
    </div>
  )
}

export function DesignDocumentHeader({ slug }: { slug: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <Link href={`/projects/${slug}/design`}>
        <ArrowLeft className="size-4" />
        Back to design library
      </Link>
    </Button>
  )
}
