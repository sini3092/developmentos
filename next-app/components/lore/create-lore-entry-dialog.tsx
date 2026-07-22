"use client"

import { useActionState, useEffect, useState } from "react"

import { createLoreEntry } from "@/lib/actions/knowledge"
import {
  CANON_STATUSES,
  CANON_STATUS_LABELS,
  LORE_ENTRY_TYPES,
  LORE_ENTRY_TYPE_LABELS,
} from "@/lib/constants/knowledge"
import { slugify } from "@/lib/utils/format"
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

type CreateLoreEntryDialogProps = {
  workspaceId: string
  projectId: string
  slug: string
  defaultType?: string
  trigger: React.ReactNode
}

function CreateLoreEntryForm({
  workspaceId,
  projectId,
  slug,
  defaultType = "other",
  onSuccess,
}: {
  workspaceId: string
  projectId: string
  slug: string
  defaultType?: string
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
          placeholder="Edrin the Rekindled"
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
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="entryType">Type</Label>
          <select
            id="entryType"
            name="entryType"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue={defaultType}
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
            {CANON_STATUSES.filter((status) => status !== "archived").map((status) => (
              <option key={status} value={status}>
                {CANON_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="summary">Short summary</Label>
        <Textarea id="summary" name="summary" rows={2} placeholder="One-line overview." />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating…" : "Create draft"}
      </Button>
    </form>
  )
}

export function CreateLoreEntryDialog({
  workspaceId,
  projectId,
  slug,
  defaultType,
  trigger,
}: CreateLoreEntryDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New lore entry</DialogTitle>
        </DialogHeader>
        <CreateLoreEntryForm
          workspaceId={workspaceId}
          projectId={projectId}
          slug={slug}
          defaultType={defaultType}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
