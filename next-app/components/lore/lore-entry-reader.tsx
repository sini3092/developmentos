import Link from "next/link"
import { ChevronRight, Pencil } from "lucide-react"

import { AskSoulsButton } from "@/components/souls/ask-souls-button"
import { LoreDevelopmentPanel } from "@/components/lore/lore-development-panel"
import { LoreRelationshipsPanel } from "@/components/knowledge/lore-relationships-panel"
import { LoreVersionsPanel } from "@/components/lore/lore-versions-panel"
import { LoreCanonBadge, LoreTypeBadge } from "@/components/lore/lore-badges"
import { LoreCommentsPanel } from "@/components/lore/lore-comments-panel"
import { LoreReviewPanel } from "@/components/lore/lore-review-panel"
import { LoreRetconPanel } from "@/components/lore/lore-retcon-panel"
import { LoreTimelineFieldsPanel } from "@/components/lore/lore-timeline-fields-panel"
import { LoreRelatedGroups } from "@/components/lore/lore-related-groups"
import { LoreRichTextContent } from "@/components/lore/lore-rich-text-content"
import { LoreSectionsReader, LoreSectionsTableOfContents } from "@/components/lore/lore-sections-reader"
import type { LoreCommentWithAuthor, LoreReviewRequestWithAuthor } from "@/lib/auth/lore-collaboration-context"
import type { LoreDevelopmentConnections, LoreDevelopmentOptions } from "@/lib/auth/lore-development-context"
import type { LoreBacklink, LoreContentBacklink } from "@/lib/auth/lore-context"
import type { BoardList, LoreEntryDetail, LoreEra, Profile } from "@/lib/database.types"
import { LORE_IMPLEMENTATION_STATUS_LABELS } from "@/lib/constants/lore-implementation"
import type { LoreLinkTarget } from "@/lib/lore/internal-links"
import { LORE_RELATIONSHIP_LABELS } from "@/lib/constants/lore-relationships"
import { formatDate } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"

type LoreEntryReaderProps = {
  entry: LoreEntryDetail
  slug: string
  backlinks: LoreBacklink[]
  contentBacklinks: LoreContentBacklink[]
  linkTargets: LoreLinkTarget[]
  comments: LoreCommentWithAuthor[]
  pendingReview: LoreReviewRequestWithAuthor | null
  members: Array<{ profile: Profile | null }>
  otherEntries: Array<{ id: string; name: string; slug: string }>
  replacementEntry?: { id: string; name: string; slug: string } | null
  devConnections: LoreDevelopmentConnections
  devOptions: LoreDevelopmentOptions
  boardLists: BoardList[]
  projectId: string
  eras: LoreEra[]
  parentOptions: Array<{ id: string; name: string }>
  canEdit: boolean
  canReview: boolean
}

export function LoreEntryReader({
  entry,
  slug,
  backlinks,
  contentBacklinks,
  linkTargets,
  comments,
  pendingReview,
  members,
  otherEntries,
  replacementEntry,
  devConnections,
  devOptions,
  boardLists,
  projectId,
  eras,
  parentOptions,
  canEdit,
  canReview,
}: LoreEntryReaderProps) {
  const hasSectionContent = entry.sections.some(
    (section) => section.content.trim() || section.content_json
  )

  return (
    <div className="flex flex-1 flex-col">
      <div className="border-b border-border/60 px-6 py-3">
        <nav className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          <Link href={`/projects/${slug}/lore`} className="hover:text-foreground">
            Lore
          </Link>
          <ChevronRight className="size-3.5" />
          <Link href={`/projects/${slug}/lore/browse`} className="hover:text-foreground">
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
                <div className="flex flex-wrap gap-2">
                  <AskSoulsButton entrySlug={entry.slug} />
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/projects/${slug}/lore/${entry.slug}/edit`}>
                      <Pencil className="size-4" />
                      Edit
                    </Link>
                  </Button>
                </div>
              ) : (
                <AskSoulsButton entrySlug={entry.slug} />
              )}
            </div>
            {entry.summary ? (
              <p className="text-lg leading-relaxed text-muted-foreground">{entry.summary}</p>
            ) : null}
            {entry.change_summary ? (
              <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Latest change: </span>
                {entry.change_summary}
              </p>
            ) : null}
          </header>

          <div className="prose-width py-8">
            {hasSectionContent ? (
              <LoreSectionsReader
                sections={entry.sections}
                projectSlug={slug}
                linkTargets={linkTargets}
              />
            ) : (
              <LoreRichTextContent
                content={entry.content}
                contentJson={entry.content_json}
                contentFormat={entry.content_format}
                projectSlug={slug}
                linkTargets={linkTargets}
              />
            )}
          </div>

          <LoreRelatedGroups
            slug={slug}
            relationships={entry.relationships}
            contentBacklinks={contentBacklinks}
          />

          {backlinks.length > 0 ? (
            <section className="mt-8 space-y-3 border-t border-border/60 pt-8">
              <h2 className="text-sm font-medium">Referenced by relationships</h2>
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
          <LoreSectionsTableOfContents sections={entry.sections} />
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
                <dt className="text-muted-foreground">Implementation</dt>
                <dd>{LORE_IMPLEMENTATION_STATUS_LABELS[entry.implementation_status]}</dd>
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

          <div className="rounded-xl border border-border/60 bg-card p-4 text-xs text-muted-foreground shadow-xs">
            Link to other entries with wiki syntax:{" "}
            <code className="rounded bg-muted px-1 py-0.5">[[Entry Name|slug]]</code>
          </div>

          <LoreRetconPanel
            entry={entry}
            slug={slug}
            otherEntries={otherEntries}
            replacementEntry={replacementEntry}
            canEdit={canEdit}
          />

          <LoreDevelopmentPanel
            entry={entry}
            slug={slug}
            projectId={projectId}
            connections={devConnections}
            options={devOptions}
            boardLists={boardLists}
            canEdit={canEdit}
          />

          <LoreTimelineFieldsPanel
            entry={entry}
            slug={slug}
            eras={eras}
            parentOptions={parentOptions}
            canEdit={canEdit}
          />

          <LoreReviewPanel
            entryId={entry.id}
            slug={slug}
            entrySlug={entry.slug}
            canonStatus={entry.canon_status}
            pendingReview={pendingReview}
            canEdit={canEdit}
            canReview={canReview}
          />

          <LoreCommentsPanel
            entryId={entry.id}
            slug={slug}
            entrySlug={entry.slug}
            comments={comments}
            sections={entry.sections}
            members={members}
            canEdit={canEdit}
          />

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
