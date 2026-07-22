"use client"

import { useMemo, useState } from "react"
import { LayoutGrid, List, Plus } from "lucide-react"

import type { LoreEntryWithAuthor } from "@/lib/database.types"
import type { CanonStatus, LoreEntryType } from "@/lib/database.types"
import { CreateLoreEntryDialog } from "@/components/lore/create-lore-entry-dialog"
import { LoreEntryCard } from "@/components/lore/lore-entry-card"
import {
  CANON_STATUSES,
  CANON_STATUS_LABELS,
  LORE_ENTRY_TYPES,
  LORE_ENTRY_TYPE_LABELS,
} from "@/lib/constants/knowledge"
import { LORE_CATEGORY_BY_HREF } from "@/lib/constants/lore-navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type LoreBrowseProps = {
  slug: string
  workspaceId: string
  projectId: string
  entries: LoreEntryWithAuthor[]
  title: string
  description?: string
  categoryHref?: string
  initialCanon?: CanonStatus | "all"
  initialSearch?: string
  canEdit: boolean
}

export function LoreBrowse({
  slug,
  workspaceId,
  projectId,
  entries,
  title,
  description,
  categoryHref,
  initialCanon = "all",
  initialSearch = "",
  canEdit,
}: LoreBrowseProps) {
  const category = categoryHref ? LORE_CATEGORY_BY_HREF[categoryHref] : null
  const [view, setView] = useState<"grid" | "list">("grid")
  const [search, setSearch] = useState(initialSearch)
  const [typeFilter, setTypeFilter] = useState<LoreEntryType | "all">("all")
  const [canonFilter, setCanonFilter] = useState<CanonStatus | "all">(initialCanon)

  const typeOptions = category?.types ?? LORE_ENTRY_TYPES

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return entries.filter((entry) => {
      if (category && !category.types.includes(entry.entry_type)) {
        return false
      }
      if (typeFilter !== "all" && entry.entry_type !== typeFilter) {
        return false
      }
      if (canonFilter !== "all" && entry.canon_status !== canonFilter) {
        return false
      }
      if (
        query &&
        !entry.name.toLowerCase().includes(query) &&
        !(entry.summary?.toLowerCase().includes(query) ?? false)
      ) {
        return false
      }
      return true
    })
  }, [entries, category, typeFilter, canonFilter, search])

  const defaultType = category?.types[0]

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          ) : null}
          <p className="mt-2 text-sm text-muted-foreground">
            {filtered.length} entr{filtered.length === 1 ? "y" : "ies"}
          </p>
        </div>
        {canEdit ? (
          <CreateLoreEntryDialog
            workspaceId={workspaceId}
            projectId={projectId}
            slug={slug}
            defaultType={defaultType}
            trigger={
              <Button>
                <Plus className="size-4" />
                New entry
              </Button>
            }
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search lore…"
          />
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value as LoreEntryType | "all")}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="all">All types</option>
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {LORE_ENTRY_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <select
            value={canonFilter}
            onChange={(event) => setCanonFilter(event.target.value as CanonStatus | "all")}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="all">All canon states</option>
            {CANON_STATUSES.map((status) => (
              <option key={status} value={status}>
                {CANON_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            size="icon"
            variant={view === "grid" ? "default" : "outline"}
            onClick={() => setView("grid")}
            aria-label="Grid view"
          >
            <LayoutGrid className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
            aria-label="List view"
          >
            <List className="size-4" />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-10 text-center text-sm text-muted-foreground">
          No lore entries match these filters.
        </p>
      ) : (
        <div
          className={cn(
            view === "grid"
              ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-2"
          )}
        >
          {filtered.map((entry) => (
            <LoreEntryCard key={entry.id} entry={entry} slug={slug} layout={view} />
          ))}
        </div>
      )}
    </div>
  )
}
