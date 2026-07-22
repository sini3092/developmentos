"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"

import { LoreVersionDiff } from "@/components/lore/lore-version-diff"
import { LORE_CHANGE_TYPE_LABELS } from "@/lib/constants/lore-change-types"
import { compareLoreVersionToEntry, compareLoreVersions } from "@/lib/lore/version-compare"
import type { LoreEntry, LoreEntryVersion, Profile } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type LoreVersionCompareViewProps = {
  slug: string
  entry: LoreEntry
  versions: Array<LoreEntryVersion & { author: Profile | null }>
  fromVersionId: string | null
  toVersionId: string | null
}

function resolveVersion(
  versions: LoreEntryVersion[],
  versionId: string | null
): LoreEntryVersion | "current" | null {
  if (!versionId) {
    return versions[0] ?? null
  }
  if (versionId === "current") {
    return "current"
  }
  return versions.find((version) => version.id === versionId) ?? null
}

export function LoreVersionCompareView({
  slug,
  entry,
  versions,
  fromVersionId,
  toVersionId,
}: LoreVersionCompareViewProps) {
  const router = useRouter()

  const fromResolved = resolveVersion(versions, fromVersionId ?? versions[0]?.id ?? null)
  const toResolved = resolveVersion(versions, toVersionId ?? "current")

  const comparison = (() => {
    if (!fromResolved || !toResolved) {
      return null
    }

    if (fromResolved === "current") {
      return null
    }

    if (toResolved === "current") {
      return compareLoreVersionToEntry(fromResolved, entry)
    }

    return compareLoreVersions(fromResolved, toResolved)
  })()

  function updateCompare(nextFrom: string, nextTo: string) {
    const params = new URLSearchParams()
    params.set("from", nextFrom)
    params.set("to", nextTo)
    router.push(`/projects/${slug}/lore/${entry.slug}/versions?${params.toString()}`)
  }

  const selectedFrom = fromResolved === "current" ? "current" : fromResolved?.id ?? ""
  const selectedTo = toResolved === "current" ? "current" : toResolved?.id ?? "current"

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="space-y-1">
          <Label htmlFor="from-version" className="text-xs">
            From
          </Label>
          <select
            id="from-version"
            className="h-9 min-w-48 rounded-lg border border-input bg-background px-2.5 text-sm"
            value={selectedFrom}
            onChange={(event) => updateCompare(event.target.value, selectedTo)}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                v{version.version_number}
                {version.change_type ? ` · ${LORE_CHANGE_TYPE_LABELS[version.change_type]}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="to-version" className="text-xs">
            To
          </Label>
          <select
            id="to-version"
            className="h-9 min-w-48 rounded-lg border border-input bg-background px-2.5 text-sm"
            value={selectedTo}
            onChange={(event) => updateCompare(selectedFrom, event.target.value)}
          >
            <option value="current">Current entry</option>
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                v{version.version_number}
                {version.change_type ? ` · ${LORE_CHANGE_TYPE_LABELS[version.change_type]}` : ""}
              </option>
            ))}
          </select>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${slug}/lore/${entry.slug}`}>Back to entry</Link>
        </Button>
      </div>

      {comparison ? (
        <LoreVersionDiff comparison={comparison} title={`${entry.name} — version comparison`} />
      ) : (
        <p className="text-sm text-muted-foreground">Select two versions to compare.</p>
      )}
    </div>
  )
}
