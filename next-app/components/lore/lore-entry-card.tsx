import Link from "next/link"

import type { LoreEntryWithAuthor } from "@/lib/database.types"
import { LoreCanonBadge, LoreTypeBadge } from "@/components/lore/lore-badges"
import { LoreEntryCover } from "@/components/lore/lore-entry-cover"
import { formatDate } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

type LoreEntryCardProps = {
  entry: LoreEntryWithAuthor
  slug: string
  layout?: "grid" | "list"
}

export function LoreEntryCard({ entry, slug, layout = "grid" }: LoreEntryCardProps) {
  if (layout === "list") {
    return (
      <Link
        href={`/projects/${slug}/lore/${entry.slug}`}
        className="flex items-center gap-4 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xs transition-colors hover:border-border hover:bg-surface-raised/50"
      >
        <LoreEntryCover name={entry.name} entryType={entry.entry_type} compact />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{entry.name}</p>
          {entry.summary ? (
            <p className="truncate text-sm text-muted-foreground">{entry.summary}</p>
          ) : null}
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <LoreTypeBadge type={entry.entry_type} />
          <LoreCanonBadge status={entry.canon_status} />
        </div>
        <p className="shrink-0 text-xs text-muted-foreground">
          {formatDate(entry.updated_at)}
        </p>
      </Link>
    )
  }

  return (
    <Link
      href={`/projects/${slug}/lore/${entry.slug}`}
      className={cn(
        "group flex h-full flex-col rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors",
        "hover:border-border hover:bg-surface-raised/50"
      )}
    >
      <div className="mb-3">
        <LoreEntryCover name={entry.name} entryType={entry.entry_type} />
      </div>
      <div className="flex flex-wrap gap-2">
        <LoreTypeBadge type={entry.entry_type} />
        <LoreCanonBadge status={entry.canon_status} />
      </div>
      <h3 className="mt-3 font-medium leading-snug group-hover:text-primary">{entry.name}</h3>
      {entry.summary ? (
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{entry.summary}</p>
      ) : (
        <div className="flex-1" />
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Updated {formatDate(entry.updated_at)}
        {entry.author?.display_name ? ` · ${entry.author.display_name}` : ""}
      </p>
    </Link>
  )
}
