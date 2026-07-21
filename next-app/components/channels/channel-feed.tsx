"use client"

import { useActionState, useEffect, useMemo, useRef, useState } from "react"

import { postChannelMessage } from "@/lib/actions/channels"
import type { ChannelMessageNode, ChannelWithMessageTree } from "@/lib/auth/channels-context"
import type { ProjectMemberWithProfile } from "@/lib/database.types"
import { ChannelMessageItem } from "@/components/channels/channel-message-item"
import { MentionTextarea } from "@/components/channels/mention-textarea"
import { Button } from "@/components/ui/button"
import { useDraftComposer } from "@/hooks/use-draft-composer"
import type { AgentName } from "@/lib/utils/mentions"
import { parseAgentMentions } from "@/lib/utils/mentions"

type ChannelFeedProps = {
  channel: ChannelWithMessageTree
  slug: string
  workspaceId: string
  projectId: string
  members: ProjectMemberWithProfile[]
  canEdit: boolean
}

function messageHasAgentReplies(message: ChannelMessageNode, agents: AgentName[]) {
  return agents.every((agent) => message.replies.some((reply) => reply.agent_name === agent))
}

function derivePendingAgents(messages: ChannelMessageNode[]) {
  const pending: Record<string, AgentName[]> = {}

  for (const message of messages) {
    const agents = parseAgentMentions(message.body)
    if (agents.length > 0 && !messageHasAgentReplies(message, agents)) {
      pending[message.id] = agents
    }
  }

  return pending
}

export function ChannelFeed({
  channel,
  slug,
  workspaceId,
  projectId,
  members,
  canEdit,
}: ChannelFeedProps) {
  const [state, formAction, pending] = useActionState(postChannelMessage, {})
  const formRef = useRef<HTMLFormElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const submitBodyRef = useRef<string | null>(null)
  const [optimisticPending, setOptimisticPending] = useState<Record<string, AgentName[]>>({})

  const derivedPending = useMemo(
    () => derivePendingAgents(channel.messages),
    [channel.messages]
  )

  const pendingAgents = useMemo(
    () => ({ ...derivedPending, ...optimisticPending }),
    [derivedPending, optimisticPending]
  )

  const memberProfiles = members.map((member) => ({
    profile: member.profile
      ? { id: member.profile.id, display_name: member.profile.display_name }
      : null,
  }))

  const draftMetadata = useMemo(
    () => ({
      channelId: channel.id,
      slug,
      channelSlug: channel.slug,
      channelName: channel.name,
      workspaceId,
      memberProfiles: JSON.stringify(memberProfiles),
    }),
    [channel.id, channel.name, channel.slug, memberProfiles, slug, workspaceId]
  )

  const draft = useDraftComposer({
    kind: "channel_message",
    contextId: channel.id,
    metadata: draftMetadata,
  })

  const { clearDraft } = draft
  const hasPendingAgents = Object.keys(pendingAgents).length > 0

  useEffect(() => {
    if (state.success && state.messageId && submitBodyRef.current) {
      const agents = parseAgentMentions(submitBodyRef.current)
      if (agents.length > 0) {
        setOptimisticPending((current) => ({ ...current, [state.messageId!]: agents }))
      }
      submitBodyRef.current = null
      formRef.current?.reset()
      void clearDraft()
    }
  }, [state.success, state.messageId, clearDraft])

  useEffect(() => {
    setOptimisticPending((current) => {
      if (Object.keys(current).length === 0) {
        return current
      }

      const next: Record<string, AgentName[]> = { ...current }
      let changed = false

      for (const messageId of Object.keys(current)) {
        if (derivedPending[messageId]) {
          continue
        }
        const message = channel.messages.find((item) => item.id === messageId)
        if (message && messageHasAgentReplies(message, current[messageId] ?? [])) {
          delete next[messageId]
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [channel.messages, derivedPending])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [channel.messages.length, hasPendingAgents])

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border/60 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">{channel.name}</h2>
          {channel.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{channel.description}</p>
          ) : null}
        </div>
      </header>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-6">
          {channel.messages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-10 text-center">
              <h3 className="text-sm font-medium">No messages yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Start the conversation in #{channel.name.toLowerCase()}.
              </p>
            </div>
          ) : (
            channel.messages.map((message) => (
              <ChannelMessageItem
                key={message.id}
                message={message}
                slug={slug}
                channelSlug={channel.slug}
                channelName={channel.name}
                channelId={channel.id}
                workspaceId={workspaceId}
                projectId={projectId}
                members={members}
                canEdit={canEdit}
                pendingAgents={pendingAgents[message.id] ?? []}
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {canEdit ? (
          <div className="border-t border-border/60 p-4">
            <form
              ref={formRef}
              action={formAction}
              className="space-y-3"
              onSubmit={(event) => {
                if (!navigator.onLine) {
                  event.preventDefault()
                  void draft.queueOffline()
                  return
                }
                submitBodyRef.current = draft.value
              }}
            >
              <input type="hidden" name="channelId" value={channel.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="channelSlug" value={channel.slug} />
              <input type="hidden" name="channelName" value={channel.name} />
              <input type="hidden" name="workspaceId" value={workspaceId} />
              <input type="hidden" name="projectId" value={projectId} />
              <input type="hidden" name="memberProfiles" value={JSON.stringify(memberProfiles)} />
              {state.error ? (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {state.error}
                </p>
              ) : null}
              {draft.queued ? (
                <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning">
                  Message saved offline — it will send when you reconnect.
                </p>
              ) : null}
              <MentionTextarea
                name="body"
                placeholder={`Message #${channel.name.toLowerCase()} — type @ for Souls, Personal, or teammates`}
                rows={3}
                required
                value={draft.value}
                onChange={draft.setValue}
                members={memberProfiles}
              />
              <div className="flex justify-end">
                <Button type="submit" disabled={pending || !draft.value.trim()}>
                  {pending ? "Sending…" : "Send message"}
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  )
}
