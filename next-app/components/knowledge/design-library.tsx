"use client"

import Link from "next/link"
import { useActionState, useEffect, useState } from "react"
import { BookOpen, Plus, Sparkles } from "lucide-react"

import { createDesignDocument, seedStarterDesignDocs } from "@/lib/actions/knowledge"
import type { DesignDocumentWithAuthor } from "@/lib/database.types"
import {
  DESIGN_CATEGORIES,
  DOCUMENT_STATUSES,
  DOCUMENT_STATUS_LABELS,
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

type DesignLibraryProps = {
  workspaceId: string
  projectId: string
  slug: string
  documents: DesignDocumentWithAuthor[]
  canEdit: boolean
}

function CreateDesignDocumentForm({
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
  const [state, formAction, pending] = useActionState(createDesignDocument, {})
  const [title, setTitle] = useState("")
  const [docSlug, setDocSlug] = useState("")

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
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            if (!docSlug) {
              setDocSlug(slugify(event.target.value))
            }
          }}
          placeholder="Core Pillars"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="docSlug">Slug</Label>
        <Input
          id="docSlug"
          name="docSlug"
          value={docSlug}
          onChange={(event) => setDocSlug(slugify(event.target.value))}
          placeholder="core-pillars"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            name="category"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue="gameplay_loops"
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
            defaultValue="draft"
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
        <Label htmlFor="summary">Summary</Label>
        <Textarea id="summary" name="summary" rows={2} placeholder="Brief overview." />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          name="content"
          rows={6}
          placeholder="# Title&#10;&#10;Document content in markdown."
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create document"}
      </Button>
    </form>
  )
}

export function DesignLibrary({
  workspaceId,
  projectId,
  slug,
  documents,
  canEdit,
}: DesignLibraryProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)

  async function handleSeed() {
    setSeeding(true)
    await seedStarterDesignDocs(projectId, slug)
    setSeeding(false)
  }

  const categoryLabel = (categoryId: string) =>
    DESIGN_CATEGORIES.find((category) => category.id === categoryId)?.label ?? categoryId

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {documents.length} design document{documents.length === 1 ? "" : "s"}
        </p>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            {documents.length === 0 ? (
              <Button variant="outline" onClick={handleSeed} disabled={seeding}>
                <Sparkles className="size-4" />
                {seeding ? "Seeding…" : "Seed starters"}
              </Button>
            ) : null}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  New document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create design document</DialogTitle>
                </DialogHeader>
                <CreateDesignDocumentForm
                  workspaceId={workspaceId}
                  projectId={projectId}
                  slug={slug}
                  onSuccess={() => setCreateOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>

      {documents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-10 text-center">
          <BookOpen className="mx-auto size-8 text-muted-foreground" />
          <h2 className="mt-4 text-sm font-medium">No design documents yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Capture game vision, loops, and systems in structured design docs.
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {documents.map((document) => (
            <Link
              key={document.id}
              href={`/projects/${slug}/design/${document.slug}`}
              className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-muted/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium">{document.title}</h3>
                  {document.summary ? (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {document.summary}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{categoryLabel(document.category)}</Badge>
                  <Badge variant="secondary">{DOCUMENT_STATUS_LABELS[document.status]}</Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
