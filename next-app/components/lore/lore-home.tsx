import Link from "next/link"
import { Plus } from "lucide-react"

import type { LoreOverview } from "@/lib/auth/lore-context"
import { CreateLoreEntryDialog } from "@/components/lore/create-lore-entry-dialog"
import { LoreCanonBadge } from "@/components/lore/lore-badges"
import { LoreEntryCard } from "@/components/lore/lore-entry-card"
import { SeedLoreForm } from "@/components/lore/seed-lore-form"
import { formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const toneBorder = {
  blue: "hover:border-info/40",
  red: "hover:border-danger/40",
  green: "hover:border-success/40",
  amber: "hover:border-warning/40",
  orange: "hover:border-orange-500/40",
  purple: "hover:border-purple-500/40",
  cyan: "hover:border-cyan-500/40",
  pink: "hover:border-pink-500/40",
} as const

type LoreHomeProps = {
  slug: string
  projectName: string
  workspaceId: string
  projectId: string
  overview: LoreOverview
  canEdit: boolean
}

export function LoreHome({
  slug,
  projectName,
  workspaceId,
  projectId,
  overview,
  canEdit,
}: LoreHomeProps) {
  const isEmpty = overview.totalEntries === 0

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-card via-card to-muted/30 p-6 shadow-xs sm:p-8">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          World bible
        </p>
        <h2 className="mt-2 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
          {projectName}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Browse characters, factions, places, and history — the canon source of truth for your
          game world.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-border/60 bg-background/60 px-3 py-1">
            {overview.canonCount} canon
          </span>
          <span className="rounded-full border border-border/60 bg-background/60 px-3 py-1">
            {overview.draftCount} drafts
          </span>
          <span className="rounded-full border border-border/60 bg-background/60 px-3 py-1">
            {overview.reviewCount} in review
          </span>
        </div>
        {canEdit ? (
          <div className="mt-6 flex flex-wrap gap-2">
            <CreateLoreEntryDialog
              workspaceId={workspaceId}
              projectId={projectId}
              slug={slug}
              trigger={
                <Button>
                  <Plus className="size-4" />
                  New entry
                </Button>
              }
            />
            {isEmpty ? <SeedLoreForm projectId={projectId} slug={slug} /> : null}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-medium">Browse by category</h3>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {overview.categoryCards.map((category) => (
            <Link
              key={category.id}
              href={`/projects/${slug}/lore/browse/${category.href}`}
              className={cn(
                "rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors",
                toneBorder[category.tone]
              )}
            >
              <p className="font-medium">{category.label}</p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {category.description}
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                {category.count} entr{category.count === 1 ? "y" : "ies"}
              </p>
              {category.recentEntry ? (
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  Latest: {category.recentEntry.name}
                </p>
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      {!isEmpty ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-medium">Recently updated</h3>
            <Link
              href={`/projects/${slug}/lore/browse?sort=updated`}
              className="text-sm text-info hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {overview.recentlyUpdated.slice(0, 6).map((entry) => (
              <LoreEntryCard key={entry.id} entry={entry} slug={slug} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <p className="text-xs text-muted-foreground uppercase">Awaiting review</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{overview.reviewCount}</p>
          <Link href={`/projects/${slug}/lore/review`} className="mt-2 inline-block text-xs text-info hover:underline">
            Open review queue
          </Link>
        </article>
        <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <p className="text-xs text-muted-foreground uppercase">Drafts</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{overview.draftCount}</p>
          <Link href={`/projects/${slug}/lore/drafts`} className="mt-2 inline-block text-xs text-info hover:underline">
            View drafts
          </Link>
        </article>
        <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <p className="text-xs text-muted-foreground uppercase">Concepts</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{overview.conceptCount}</p>
        </article>
        <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <p className="text-xs text-muted-foreground uppercase">Archived</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{overview.archivedCount}</p>
        </article>
      </section>

      {!isEmpty ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Latest activity</h3>
          <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
            {overview.recentlyUpdated.slice(0, 5).map((entry) => (
              <Link
                key={entry.id}
                href={`/projects/${slug}/lore/${entry.slug}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="font-medium">{entry.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {entry.author?.display_name ?? "Unknown"} · {formatDate(entry.updated_at)}
                  </p>
                </div>
                <LoreCanonBadge status={entry.canon_status} />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
