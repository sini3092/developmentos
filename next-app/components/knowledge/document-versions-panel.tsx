"use client"

import { useActionState } from "react"
import { History } from "lucide-react"

import { restoreDesignDocumentVersion, restoreLoreEntryVersion } from "@/lib/actions/knowledge"
import type {
  DesignDocumentVersion,
  LoreEntryVersion,
  Profile,
} from "@/lib/database.types"
import { Button } from "@/components/ui/button"

type DocumentVersionsPanelProps = {
  slug: string
  docSlug: string
  documentId: string
  versions: Array<DesignDocumentVersion & { author: Profile | null }>
  canEdit: boolean
}

type LoreVersionsPanelProps = {
  slug: string
  entrySlug: string
  entryId: string
  versions: Array<LoreEntryVersion & { author: Profile | null }>
  canEdit: boolean
}

function formatVersionDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function DocumentVersionsPanel({
  slug,
  docSlug,
  documentId,
  versions,
  canEdit,
}: DocumentVersionsPanelProps) {
  const [state, restoreAction, pending] = useActionState(restoreDesignDocumentVersion, {})

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <History className="size-4" />
        Version history
      </h3>
      {state.error ? <p className="mt-2 text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="mt-2 text-sm text-success">{state.success}</p> : null}
      {versions.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No saved versions yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">v{version.version_number}</p>
                <p className="text-xs text-muted-foreground">
                  {formatVersionDate(version.created_at)}
                  {version.author ? ` · ${version.author.display_name}` : ""}
                </p>
              </div>
              {canEdit ? (
                <form action={restoreAction}>
                  <input type="hidden" name="documentId" value={documentId} />
                  <input type="hidden" name="versionId" value={version.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="docSlug" value={docSlug} />
                  <Button type="submit" size="sm" variant="outline" disabled={pending}>
                    Restore
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function LoreVersionsPanel({
  slug,
  entrySlug,
  entryId,
  versions,
  canEdit,
}: LoreVersionsPanelProps) {
  const [state, restoreAction, pending] = useActionState(restoreLoreEntryVersion, {})

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <History className="size-4" />
        Version history
      </h3>
      {state.error ? <p className="mt-2 text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="mt-2 text-sm text-success">{state.success}</p> : null}
      {versions.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No saved versions yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {versions.map((version) => (
            <li
              key={version.id}
              className="flex items-start justify-between gap-2 rounded-lg border border-border/50 px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="font-medium">v{version.version_number}</p>
                <p className="text-xs text-muted-foreground">
                  {formatVersionDate(version.created_at)}
                  {version.author ? ` · ${version.author.display_name}` : ""}
                </p>
              </div>
              {canEdit ? (
                <form action={restoreAction}>
                  <input type="hidden" name="entryId" value={entryId} />
                  <input type="hidden" name="versionId" value={version.id} />
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="entrySlug" value={entrySlug} />
                  <Button type="submit" size="sm" variant="outline" disabled={pending}>
                    Restore
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
