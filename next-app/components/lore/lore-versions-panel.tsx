"use client"

import Link from "next/link"
import { useActionState } from "react"
import { GitCompare, History } from "lucide-react"

import { restoreLoreEntryVersion } from "@/lib/actions/knowledge"
import { LORE_CHANGE_TYPE_LABELS } from "@/lib/constants/lore-change-types"
import type { LoreEntryVersion, Profile } from "@/lib/database.types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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

const changeTypeTone: Record<string, string> = {
  minor: "border-info/30 bg-info/10 text-info",
  major: "border-warning/30 bg-warning/10 text-warning",
  retcon: "border-danger/30 bg-danger/10 text-danger",
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
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <History className="size-4" />
          Version history
        </h3>
        {versions.length > 0 ? (
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/projects/${slug}/lore/${entrySlug}/versions`}>
              <GitCompare className="size-4" />
              Compare
            </Link>
          </Button>
        ) : null}
      </div>
      {state.error ? <p className="mt-2 text-sm text-danger">{state.error}</p> : null}
      {state.success ? <p className="mt-2 text-sm text-success">{state.success}</p> : null}
      {versions.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No saved versions yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {versions.map((version, index) => (
            <li
              key={version.id}
              className="rounded-lg border border-border/50 px-3 py-2 text-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">v{version.version_number}</p>
                    {version.change_type ? (
                      <Badge
                        variant="outline"
                        className={cn("font-normal", changeTypeTone[version.change_type])}
                      >
                        {LORE_CHANGE_TYPE_LABELS[version.change_type]}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatVersionDate(version.created_at)}
                    {version.author ? ` · ${version.author.display_name}` : ""}
                  </p>
                  {version.change_summary ? (
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {version.change_summary}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <Button variant="ghost" size="sm" asChild>
                    <Link
                      href={`/projects/${slug}/lore/${entrySlug}/versions?from=${version.id}${
                        versions[index + 1]
                          ? `&to=${versions[index + 1]!.id}`
                          : "&to=current"
                      }`}
                    >
                      Diff
                    </Link>
                  </Button>
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
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
