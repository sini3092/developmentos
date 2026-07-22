"use client"

import { useActionState, useState } from "react"
import { CheckCircle2, MessageSquare, RotateCcw } from "lucide-react"

import {
  addLoreComment,
  updateLoreCommentStatus,
} from "@/lib/actions/lore-collaboration"
import { MentionTextarea } from "@/components/channels/mention-textarea"
import { renderMessageBody, MENTION_CHIP_CLASS } from "@/lib/utils/mentions"
import type { LoreCommentWithAuthor } from "@/lib/auth/lore-collaboration-context"
import type { LoreSection, Profile } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type LoreCommentsPanelProps = {
  entryId: string
  slug: string
  entrySlug: string
  comments: LoreCommentWithAuthor[]
  sections: LoreSection[]
  members: Array<{ profile: Profile | null }>
  canEdit: boolean
  sectionId?: string
}

function formatCommentDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function LoreCommentItem({
  comment,
  slug,
  entrySlug,
  canEdit,
  onReply,
}: {
  comment: LoreCommentWithAuthor
  slug: string
  entrySlug: string
  canEdit: boolean
  onReply: (commentId: string) => void
}) {
  const [state, resolveAction, pending] = useActionState(updateLoreCommentStatus, {})
  const isResolved = comment.status === "resolved"

  return (
    <li
      className={cn(
        "rounded-lg border border-border/60 px-3 py-2 text-sm",
        isResolved && "bg-muted/30 opacity-80"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {comment.author?.display_name ?? "Unknown"}
            </span>
            <span>{formatCommentDate(comment.created_at)}</span>
            {comment.section ? (
              <span className="rounded bg-muted px-1.5 py-0.5">{comment.section.title}</span>
            ) : null}
            {isResolved ? <span className="text-success">Resolved</span> : null}
          </div>
          <p className="mt-1 whitespace-pre-wrap leading-relaxed">
            {renderMessageBody(comment.content).map((part, index) =>
              part.type === "mention" ? (
                <span key={index} className={MENTION_CHIP_CLASS}>
                  {part.value}
                </span>
              ) : (
                <span key={index}>{part.value}</span>
              )
            )}
          </p>
          {state.error ? <p className="mt-1 text-xs text-danger">{state.error}</p> : null}
        </div>
        {canEdit ? (
          <div className="flex shrink-0 gap-1">
            {!isResolved ? (
              <Button type="button" size="sm" variant="ghost" onClick={() => onReply(comment.id)}>
                Reply
              </Button>
            ) : null}
            <form action={resolveAction}>
              <input type="hidden" name="commentId" value={comment.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="entrySlug" value={entrySlug} />
              <input type="hidden" name="status" value={isResolved ? "open" : "resolved"} />
              <Button type="submit" size="sm" variant="outline" disabled={pending}>
                {isResolved ? (
                  <>
                    <RotateCcw className="size-3.5" />
                    Reopen
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="size-3.5" />
                    Resolve
                  </>
                )}
              </Button>
            </form>
          </div>
        ) : null}
      </div>
      {comment.replies.length > 0 ? (
        <ul className="mt-2 space-y-2 border-l border-border/60 pl-3">
          {comment.replies.map((reply) => (
            <LoreCommentItem
              key={reply.id}
              comment={reply}
              slug={slug}
              entrySlug={entrySlug}
              canEdit={canEdit}
              onReply={onReply}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function LoreCommentsPanel({
  entryId,
  slug,
  entrySlug,
  comments,
  sections,
  members,
  canEdit,
  sectionId,
}: LoreCommentsPanelProps) {
  const [state, formAction, pending] = useActionState(addLoreComment, {})
  const [content, setContent] = useState("")
  const [replyToId, setReplyToId] = useState("")
  const [filterSectionId, setFilterSectionId] = useState(sectionId ?? "")

  const visibleComments = filterSectionId
    ? comments.filter((comment) => comment.section_id === filterSectionId)
    : comments

  const openCount = comments.filter((comment) => comment.status === "open").length

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="size-4" />
          Discussion
        </h3>
        {openCount > 0 ? (
          <span className="text-xs text-muted-foreground">{openCount} open</span>
        ) : null}
      </div>

      {sections.length > 0 ? (
        <div className="mt-3">
          <label htmlFor="comment-section-filter" className="text-xs text-muted-foreground">
            Filter by section
          </label>
          <select
            id="comment-section-filter"
            value={filterSectionId}
            onChange={(event) => setFilterSectionId(event.target.value)}
            className="mt-1 h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
          >
            <option value="">All sections</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {visibleComments.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visibleComments.map((comment) => (
            <LoreCommentItem
              key={comment.id}
              comment={comment}
              slug={slug}
              entrySlug={entrySlug}
              canEdit={canEdit}
              onReply={setReplyToId}
            />
          ))}
        </ul>
      )}

      {canEdit ? (
        <form action={formAction} className="mt-4 space-y-3 border-t border-border/60 pt-4">
          <input type="hidden" name="entryId" value={entryId} />
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="entrySlug" value={entrySlug} />
          <input type="hidden" name="sectionId" value={filterSectionId} />
          <input type="hidden" name="parentCommentId" value={replyToId} />
          {replyToId ? (
            <p className="text-xs text-muted-foreground">
              Replying to a comment.{" "}
              <button type="button" className="text-info hover:underline" onClick={() => setReplyToId("")}>
                Cancel
              </button>
            </p>
          ) : null}
          <MentionTextarea
            name="content"
            value={content}
            onChange={setContent}
            members={members}
            placeholder="Add feedback or ask a question. Use @name to mention someone."
            rows={3}
            required
          />
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-success">{state.success}</p> : null}
          <Button type="submit" size="sm" disabled={pending || !content.trim()}>
            {pending ? "Posting…" : "Post comment"}
          </Button>
        </form>
      ) : null}
    </div>
  )
}
