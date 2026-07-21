"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useMemo, useState, useTransition } from "react"
import { ListTodo, MessageSquare, Reply } from "lucide-react"

import {
  convertMessageToTask,
  postChannelMessage,
  toggleMessageReaction,
} from "@/lib/actions/channels"
import type { ChannelMessageNode } from "@/lib/auth/channels-context"
import type { ProjectMemberWithProfile } from "@/lib/database.types"
import { AgentTypingIndicator } from "@/components/channels/agent-typing-indicator"
import { MessageBody } from "@/components/channels/message-body"
import { QUICK_REACTIONS } from "@/lib/utils/mentions"
import type { AgentName } from "@/lib/utils/mentions"
import { getInitials } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MentionTextarea } from "@/components/channels/mention-textarea"
import { useDraftComposer } from "@/hooks/use-draft-composer"
import { cn } from "@/lib/utils"

type ChannelMessageItemProps = {
  message: ChannelMessageNode
  slug: string
  channelSlug: string
  channelName: string
  channelId: string
  workspaceId: string
  projectId: string
  members: ProjectMemberWithProfile[]
  canEdit: boolean
  isReply?: boolean
  pendingAgents?: AgentName[]
  failedAgent?: { agent: AgentName; error: string } | null
}

export function ChannelMessageItem({
  message,
  slug,
  channelSlug,
  channelName,
  channelId,
  workspaceId,
  projectId,
  members,
  canEdit,
  isReply = false,
  pendingAgents = [],
  failedAgent = null,
}: ChannelMessageItemProps) {
  const router = useRouter()
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showConvertForm, setShowConvertForm] = useState(false)
  const [replyState, replyAction, replyPending] = useActionState(postChannelMessage, {})
  const [convertState, convertAction, convertPending] = useActionState(convertMessageToTask, {})
  const [isReacting, startReact] = useTransition()

  const memberProfiles = members.map((member) => ({
    profile: member.profile
      ? { id: member.profile.id, display_name: member.profile.display_name }
      : null,
  }))

  const replyMetadata = useMemo(
    () => ({
      channelId,
      slug,
      channelSlug,
      channelName,
      workspaceId,
      parentMessageId: message.id,
      memberProfiles: JSON.stringify(memberProfiles),
    }),
    [channelId, channelName, channelSlug, memberProfiles, message.id, slug, workspaceId]
  )

  const replyDraft = useDraftComposer({
    kind: "channel_reply",
    contextId: `${channelId}:${message.id}`,
    metadata: replyMetadata,
    enabled: showReplyForm,
  })

  const { clearDraft: clearReplyDraft } = replyDraft

  useEffect(() => {
    if (replyState.success) {
      setShowReplyForm(false)
      void clearReplyDraft()
      router.refresh()
    }
  }, [replyState.success, router, clearReplyDraft])

  useEffect(() => {
    if (convertState.success) {
      setShowConvertForm(false)
      router.refresh()
    }
  }, [convertState.success, router])

  return (
    <article className={cn("flex gap-3", isReply && "ml-10 border-l-2 border-border/60 pl-4")}>
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium",
          message.agent_name === "souls"
            ? "bg-primary/15 text-primary"
            : message.agent_name === "personal"
              ? "bg-info/15 text-info"
              : "bg-muted"
        )}
      >
        {message.agent_name === "souls"
          ? "AI"
          : message.agent_name === "personal"
            ? "CX"
            : getInitials(message.author?.display_name)}
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium">
            {message.agent_name === "souls"
              ? "Souls"
              : message.agent_name === "personal"
                ? "Personal"
                : (message.author?.display_name ?? "Unknown")}
          </span>
          <time className="text-xs text-muted-foreground" dateTime={message.created_at}>
            {new Date(message.created_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </time>
        </div>

        <MessageBody body={message.body} agentName={message.agent_name} />

        {pendingAgents.length > 0 ? (
          <div className="space-y-2">
            {pendingAgents.map((agent) => (
              <AgentTypingIndicator key={agent} agent={agent} />
            ))}
          </div>
        ) : null}

        {failedAgent ? (
          <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            {failedAgent.agent === "personal" ? "Personal (Codex)" : "Souls"} could not complete the
            job: {failedAgent.error}
          </p>
        ) : null}

        {message.linked_task ? (
          <Link
            href={`/projects/${slug}/tasks?task=${message.linked_task.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface-raised/50 px-2.5 py-1 text-xs hover:border-info/40"
          >
            <ListTodo className="size-3.5" />
            <span className="font-mono">{message.linked_task.identifier}</span>
            <span className="truncate">{message.linked_task.title}</span>
          </Link>
        ) : null}

        {message.reaction_groups.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {message.reaction_groups.map((group) => (
              <button
                key={group.emoji}
                type="button"
                disabled={!canEdit || isReacting}
                onClick={() => {
                  startReact(async () => {
                    await toggleMessageReaction(
                      message.id,
                      group.emoji,
                      slug,
                      channelSlug,
                      group.reacted_by_current_user
                    )
                    router.refresh()
                  })
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                  group.reacted_by_current_user
                    ? "border-info/40 bg-info/10"
                    : "border-border/60 bg-surface-raised/50"
                )}
              >
                <span>{group.emoji}</span>
                <span>{group.count}</span>
              </button>
            ))}
          </div>
        ) : null}

        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            {QUICK_REACTIONS.map((emoji) => {
              const existing = message.reaction_groups.find((group) => group.emoji === emoji)
              return (
                <button
                  key={emoji}
                  type="button"
                  disabled={isReacting}
                  onClick={() => {
                    startReact(async () => {
                      await toggleMessageReaction(
                        message.id,
                        emoji,
                        slug,
                        channelSlug,
                        Boolean(existing?.reacted_by_current_user)
                      )
                      router.refresh()
                    })
                  }}
                  className="rounded p-1 text-sm opacity-60 hover:bg-muted hover:opacity-100"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              )
            })}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 px-2"
              onClick={() => setShowReplyForm((value) => !value)}
            >
              <Reply className="mr-1 size-3.5" />
              Reply
              {message.replies.length > 0 ? ` (${message.replies.length})` : ""}
            </Button>
            {!message.linked_task ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => setShowConvertForm((value) => !value)}
              >
                <MessageSquare className="mr-1 size-3.5" />
                Convert to task
              </Button>
            ) : null}
          </div>
        ) : null}

        {showReplyForm && canEdit ? (
          <form
            action={replyAction}
            className="space-y-2 rounded-lg border border-border/60 p-3"
            onSubmit={(event) => {
              if (!navigator.onLine) {
                event.preventDefault()
                void replyDraft.queueOffline()
              }
            }}
          >
            <input type="hidden" name="channelId" value={channelId} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="channelSlug" value={channelSlug} />
            <input type="hidden" name="channelName" value={channelName} />
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="parentMessageId" value={message.id} />
            <input
              type="hidden"
              name="memberProfiles"
              value={JSON.stringify(memberProfiles)}
            />
            {replyDraft.queued ? (
              <p className="text-sm text-warning">Reply saved offline — it will send when you reconnect.</p>
            ) : null}
            <MentionTextarea
              name="body"
              placeholder="Reply in thread..."
              rows={2}
              required
              value={replyDraft.value}
              onChange={replyDraft.setValue}
              members={memberProfiles}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.currentTarget.form?.requestSubmit()
                }
              }}
            />
            {replyState.error ? <p className="text-sm text-danger">{replyState.error}</p> : null}
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowReplyForm(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={replyPending || !replyDraft.value.trim()}>
                {replyPending ? "Sending..." : "Send reply"}
              </Button>
            </div>
          </form>
        ) : null}

        {showConvertForm && canEdit && !message.linked_task ? (
          <form action={convertAction} className="space-y-2 rounded-lg border border-border/60 p-3">
            <input type="hidden" name="messageId" value={message.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="channelSlug" value={channelSlug} />
            <input type="hidden" name="channelName" value={channelName} />
            <Input
              name="title"
              placeholder="Task title"
              defaultValue={message.body.split("\n")[0]?.slice(0, 200)}
              required
            />
            <select
              name="assigneeId"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              defaultValue=""
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.user_id} value={member.user_id}>
                  {member.profile?.display_name ?? member.user_id}
                </option>
              ))}
            </select>
            {convertState.error ? (
              <p className="text-sm text-danger">{convertState.error}</p>
            ) : null}
            {convertState.success ? (
              <p className="text-sm text-success">{convertState.success}</p>
            ) : null}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setShowConvertForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={convertPending}>
                {convertPending ? "Creating..." : "Create task"}
              </Button>
            </div>
          </form>
        ) : null}

        {message.replies.length > 0 ? (
          <div className="space-y-4 pt-2">
            {message.replies.map((reply) => (
              <ChannelMessageItem
                key={reply.id}
                message={reply}
                slug={slug}
                channelSlug={channelSlug}
                channelName={channelName}
                channelId={channelId}
                workspaceId={workspaceId}
                projectId={projectId}
                members={members}
                canEdit={canEdit}
                isReply
              />
            ))}
          </div>
        ) : null}
      </div>
    </article>
  )
}
