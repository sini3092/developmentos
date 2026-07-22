"use client"

import Link from "next/link"
import { useActionState } from "react"
import { CheckCircle2, XCircle } from "lucide-react"

import { resolveLoreReview } from "@/lib/actions/lore-collaboration"
import { LoreCanonBadge, LoreTypeBadge } from "@/components/lore/lore-badges"
import type { LoreEntryWithAuthor } from "@/lib/database.types"
import type { LoreReviewRequestWithAuthor } from "@/lib/auth/lore-collaboration-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type LoreReviewQueueProps = {
  slug: string
  entries: LoreEntryWithAuthor[]
  reviewsByEntryId: Record<string, LoreReviewRequestWithAuthor>
  canReview: boolean
}

function LoreReviewQueueItem({
  slug,
  entry,
  review,
  canReview,
}: {
  slug: string
  entry: LoreEntryWithAuthor
  review: LoreReviewRequestWithAuthor | undefined
  canReview: boolean
}) {
  const [approveState, approveAction, approvePending] = useActionState(resolveLoreReview, {})
  const [changesState, changesAction, changesPending] = useActionState(resolveLoreReview, {})

  return (
    <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <LoreTypeBadge type={entry.entry_type} />
            <LoreCanonBadge status={entry.canon_status} />
          </div>
          <Link
            href={`/projects/${slug}/lore/${entry.slug}`}
            className="text-lg font-medium hover:text-info"
          >
            {entry.name}
          </Link>
          {entry.summary ? (
            <p className="text-sm text-muted-foreground">{entry.summary}</p>
          ) : null}
          {review?.message ? (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
              <span className="font-medium">Reviewer note: </span>
              {review.message}
            </p>
          ) : null}
        </div>
        <Link
          href={`/projects/${slug}/lore/${entry.slug}/edit`}
          className="text-sm text-info hover:underline"
        >
          Open editor
        </Link>
      </div>

      {canReview && review ? (
        <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row">
          <form action={approveAction} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="reviewId" value={review.id} />
            <input type="hidden" name="entryId" value={entry.id} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="entrySlug" value={entry.slug} />
            <input type="hidden" name="decision" value="approved" />
            <Input name="resolutionNote" placeholder="Approval note (optional)" className="flex-1" />
            <Button type="submit" size="sm" disabled={approvePending}>
              <CheckCircle2 className="size-4" />
              Approve
            </Button>
          </form>
          <form action={changesAction} className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-end">
            <input type="hidden" name="reviewId" value={review.id} />
            <input type="hidden" name="entryId" value={entry.id} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="entrySlug" value={entry.slug} />
            <input type="hidden" name="decision" value="changes_requested" />
            <Input name="resolutionNote" placeholder="Feedback for author" className="flex-1" required />
            <Button type="submit" size="sm" variant="outline" disabled={changesPending}>
              <XCircle className="size-4" />
              Request changes
            </Button>
          </form>
        </div>
      ) : null}
      {approveState.error || changesState.error ? (
        <p className="mt-2 text-sm text-danger">{approveState.error ?? changesState.error}</p>
      ) : null}
      {approveState.success || changesState.success ? (
        <p className="mt-2 text-sm text-success">{approveState.success ?? changesState.success}</p>
      ) : null}
    </article>
  )
}

export function LoreReviewQueue({
  slug,
  entries,
  reviewsByEntryId,
  canReview,
}: LoreReviewQueueProps) {
  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-border/60 bg-card p-6 text-sm text-muted-foreground shadow-xs">
        No entries are waiting for review.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <LoreReviewQueueItem
          key={entry.id}
          slug={slug}
          entry={entry}
          review={reviewsByEntryId[entry.id]}
          canReview={canReview}
        />
      ))}
    </div>
  )
}
