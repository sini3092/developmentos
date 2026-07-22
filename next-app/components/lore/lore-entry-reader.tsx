import Link from "next/link"
import { ChevronRight, Pencil } from "lucide-react"

import { LoreRelationshipsPanel } from "@/components/knowledge/lore-relationships-panel"
import { LoreVersionsPanel } from "@/components/knowledge/document-versions-panel"
import { RichTextContent } from "@/components/knowledge/rich-text-content"
import { LoreCanonBadge, LoreTypeBadge } from "@/components/lore/lore-badges"
import type { LoreBacklink } from "@/lib/auth/lore-context"
import type { LoreEntryDetail } from "@/lib/database.types"
import { LORE_RELATIONSHIP_LABELS } from "@/lib/constants/lore-relationships"
import { formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"

type LoreEntryReaderProps = {
  entry: LoreEntryDetail
  slug: string
  backlinks: LoreBacklink[]
  otherEntries: Array<{ id: string; name: string; slug: string }>
  canEdit: boolean
}

export function LoreEntryReader({
  entry,
  slug,
  backlinks,
  otherEntries,
  canEdit,
}: LoreEntryReaderProps) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border/60 px-6 py-3">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href={`/projects/${slug}/lore`} className="hover:text-foreground">
            Lore
          </Link>
          <ChevronRight className="size-3.5" />
          <Link
            href={`/projects/${slug}/lore/browse`}
            className="hover:text-foreground"
          >
            Browse
          </Link>
          <ChevronRight className="size-3.5" />
          <span className="text-foreground">{entry.name}</span>
        </nav>
      </div>

      <div className="grid flex-1 gap-8 p-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <article className="mx-auto w-full max-w-[48rem]">
          <header className="space-y-4 border-b border-border/60 pb-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <LoreTypeBadge type={entry.entry_type} />
                  <LoreCanonBadge status={entry.canon_status} />
                </div>
                <h1 className="font-serif text-3xl font-semibold tracking-tight sm:text-4xl">
                  {entry.name}
                </h1>
              </div>
              {canEdit ? (
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/projects/${slug}/lore/${entry.slug}/edit`}>
                    <Pencil className="size-4" />
                    Edit
                  </Link>
                </Button>
              ) : null}
            </div>
            {entry.summary ? (
              <p className="text-lg leading-relaxed text-muted-foreground">{entry.summary}</p>
            ) : null}
          </header>

          <div className="prose-width py-8">
            <RichTextContent
              content={entry.content}
              contentJson={entry.content_json}
              contentFormat={entry.content_format}
            />
          </div>

          {entry.relationships.length > 0 ? (
            <section className="mt-8 space-y-3 border-t border-border/60 pt-8">
              <h2 className="text-sm font-medium">Related lore</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {entry.relationships.map((relationship) => (
                  <Link
                    key={relationship.id}
                    href={`/projects/${slug}/lore/${relationship.target_slug}`}
                    className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:border-info/40 hover:bg-info/5"
                  >
                    <p className="text-xs text-muted-foreground">
                      {LORE_RELATIONSHIP_LABELS[relationship.relationship_type]}
                    </p>
                    <p className="mt-1 font-medium">{relationship.target_name}</p>
                    {relationship.label ? (
                      <p className="mt-1 text-sm text-muted-foreground">{relationship.label}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {backlinks.length > 0 ? (
            <section className="mt-8 space-y-3 border-t border-border/60 pt-8">
              <h2 className="text-sm font-medium">Referenced by</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {backlinks.map((backlink) => (
                  <Link
                    key={backlink.id}
                    href={`/projects/${slug}/lore/${backlink.slug}`}
                    className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-muted/30"
                  >
                    <p className="text-xs text-muted-foreground">
                      {LORE_RELATIONSHIP_LABELS[
                        backlink.relationship_type as keyof typeof LORE_RELATIONSHIP_LABELS
                      ] ?? backlink.relationship_type}
                    </p>
                    <p className="mt-1 font-medium">{backlink.name}</p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </article>

        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
            <h3 className="text-sm font-medium">Key facts</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Type</dt>
                <dd>{entry.entry_type.replace(/_/g, " ")}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Canon</dt>
                <dd>{entry.canon_status}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Author</dt>
                <dd>{entry.author?.display_name ?? "Unknown"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{formatDate(entry.updated_at)}</dd>
              </div>
            </dl>
          </div>

          <LoreRelationshipsPanel
            slug={slug}
            entryId={entry.id}
            entrySlug={entry.slug}
            relationships={entry.relationships}
            otherEntries={otherEntries}
            canEdit={canEdit}
          />
          <LoreVersionsPanel
            slug={slug}
            entrySlug={entry.slug}
            entryId={entry.id}
            versions={entry.versions}
            canEdit={canEdit}
          />
        </aside>
      </div>
    </div>
  )
}
