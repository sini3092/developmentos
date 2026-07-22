"use client"

import { useActionState } from "react"
import { CheckCircle2, ClipboardCheck, Undo2, XCircle } from "lucide-react"

import {
  cancelLoreReview,
  requestLoreReview,
  resolveLoreReview,
} from "@/lib/actions/lore-collaboration"
import type { LoreReviewRequestWithAuthor } from "@/lib/auth/lore-collaboration-context"
import type { CanonStatus } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type LoreReviewPanelProps = {
  entryId: string
  slug: string
  entrySlug: string
  canonStatus: CanonStatus
  pendingReview: LoreReviewRequestWithAuthor | null
  canEdit: boolean
  canReview: boolean
}

function formatReviewDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function LoreReviewPanel({
  entryId,
  slug,
  entrySlug,
  canonStatus,
  pendingReview,
  canEdit,
  canReview,
}: LoreReviewPanelProps) {
  const [requestState, requestAction, requestPending] = useActionState(requestLoreReview, {})
  const [approveState, approveAction, approvePending] = useActionState(resolveLoreReview, {})
  const [changesState, changesAction, changesPending] = useActionState(resolveLoreReview, {})
  const [cancelState, cancelAction, cancelPending] = useActionState(cancelLoreReview, {})

  const showRequestForm =
    canEdit && !pendingReview && canonStatus !== "review" && canonStatus !== "archived"

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <ClipboardCheck className="size-4" />
        Canon review
      </h3>

      {pendingReview ? (
        <div className="mt-3 space-y-3 rounded-lg border border-info/30 bg-info/5 p-3 text-sm">
          <p className="font-medium text-info">Awaiting review</p>
          <p className="text-xs text-muted-foreground">
            Requested by {pendingReview.requester?.display_name ?? "Unknown"} ·{" "}
            {formatReviewDate(pendingReview.created_at)}
          </p>
          {pendingReview.message ? (
            <p className="text-sm leading-relaxed">{pendingReview.message}</p>
          ) : null}

          {canReview ? (
            <div className="space-y-3 border-t border-border/40 pt-3">
              <form action={approveAction} className="space-y-2">
                <input type="hidden" name="reviewId" value={pendingReview.id} />
                <input type="hidden" name="entryId" value={entryId} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="entrySlug" value={entrySlug} />
                <input type="hidden" name="decision" value="approved" />
                <Label htmlFor="approve-note" className="text-xs">
                  Approval note (optional)
                </Label>
                <Input id="approve-note" name="resolutionNote" placeholder="Looks good — approved as canon." />
                <Button type="submit" size="sm" disabled={approvePending}>
                  <CheckCircle2 className="size-4" />
                  {approvePending ? "Approving…" : "Approve as canon"}
                </Button>
                {approveState.error ? <p className="text-xs text-danger">{approveState.error}</p> : null}
                {approveState.success ? <p className="text-xs text-success">{approveState.success}</p> : null}
              </form>

              <form action={changesAction} className="space-y-2">
                <input type="hidden" name="reviewId" value={pendingReview.id} />
                <input type="hidden" name="entryId" value={entryId} />
                <input type="hidden" name="slug" value={slug} />
                <input type="hidden" name="entrySlug" value={entrySlug} />
                <input type="hidden" name="decision" value="changes_requested" />
                <Label htmlFor="changes-note" className="text-xs">
                  Feedback for author
                </Label>
                <Textarea
                  id="changes-note"
                  name="resolutionNote"
                  rows={2}
                  placeholder="Please clarify the timeline connection…"
                />
                <Button type="submit" size="sm" variant="outline" disabled={changesPending}>
                  <XCircle className="size-4" />
                  {changesPending ? "Sending…" : "Request changes"}
                </Button>
                {changesState.error ? <p className="text-xs text-danger">{changesState.error}</p> : null}
                {changesState.success ? <p className="text-xs text-success">{changesState.success}</p> : null}
              </form>
            </div>
          ) : null}

          {canEdit ? (
            <form action={cancelAction}>
              <input type="hidden" name="reviewId" value={pendingReview.id} />
              <input type="hidden" name="entryId" value={entryId} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="entrySlug" value={entrySlug} />
              <Button type="submit" size="sm" variant="ghost" disabled={cancelPending}>
                <Undo2 className="size-4" />
                {cancelPending ? "Cancelling…" : "Cancel review request"}
              </Button>
              {cancelState.error ? <p className="text-xs text-danger">{cancelState.error}</p> : null}
              {cancelState.success ? <p className="text-xs text-success">{cancelState.success}</p> : null}
            </form>
          ) : null}
        </div>
      ) : showRequestForm ? (
        <form action={requestAction} className="mt-3 space-y-3">
          <input type="hidden" name="entryId" value={entryId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="entrySlug" value={entrySlug} />
          <p className="text-xs text-muted-foreground">
            Send this entry to the review queue for canon approval.
          </p>
          <div className="space-y-1">
            <Label htmlFor="review-message" className="text-xs">
              Note for reviewers (optional)
            </Label>
            <Textarea
              id="review-message"
              name="message"
              rows={2}
              placeholder="Ready for canon — expanded the faction history section."
            />
          </div>
          {requestState.error ? <p className="text-sm text-danger">{requestState.error}</p> : null}
          {requestState.success ? <p className="text-sm text-success">{requestState.success}</p> : null}
          <Button type="submit" size="sm" disabled={requestPending}>
            {requestPending ? "Submitting…" : "Request review"}
          </Button>
        </form>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {canonStatus === "canon"
            ? "This entry is approved canon."
            : canonStatus === "archived"
              ? "Archived entries are not reviewed."
              : "No active review request."}
        </p>
      )}
    </div>
  )
}
