"use client"

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"

import { postChannelMessage } from "@/lib/actions/channels"
import type { ChannelMessageNode, ChannelWithMessageTree } from "@/lib/auth/channels-context"
import type { ProjectMemberWithProfile } from "@/lib/database.types"
import { ChannelMessageItem } from "@/components/channels/channel-message-item"
import { MentionTextarea } from "@/components/channels/mention-textarea"
import { Button } from "@/components/ui/button"
import { useDraftComposer } from "@/hooks/use-draft-composer"
import { useChannelMessagesLive } from "@/hooks/use-channel-messages-live"
import {
  getJobsForMessage,
  isAgentJobActive,
  isAgentJobTerminal,
  useChannelAgentsLive,
  type ChannelAgentJob,
} from "@/hooks/use-channel-agents-live"
import { personalAwaitingFinalReply, personalHasFinalReply } from "@/lib/channels/personal-agent-status"
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

function derivePendingAgents(
  messages: ChannelMessageNode[],
  agentJobs: ChannelAgentJob[]
) {
  const pending: Record<string, AgentName[]> = {}

  for (const message of messages) {
    const agents = parseAgentMentions(message.body)
    if (agents.length === 0) {
      continue
    }

    const messageJobs = getJobsForMessage(agentJobs, message.id)
    const stillPending = agents.filter((agent) => {
      if (agent === "personal") {
        if (personalHasFinalReply(message)) {
          return false
        }

        const job = messageJobs.find((item) => item.agent_name === agent)
        if (job) {
          if (isAgentJobActive(job)) {
            return true
          }
          if (isAgentJobTerminal(job)) {
            return true
          }
        }

        return personalAwaitingFinalReply(message)
      }

      return !messageHasAgentReplies(message, [agent])
    })

    if (stillPending.length > 0) {
      pending[message.id] = stillPending
    }
  }

  return pending
}

function deriveFailedAgents(
  messages: ChannelMessageNode[],
  agentJobs: ChannelAgentJob[]
) {
  const failed: Record<string, { agent: AgentName; error: string }> = {}

  for (const message of messages) {
    const hasFailureReply = message.replies.some(
      (reply) =>
        reply.agent_name === "personal" &&
        /could not complete the job/i.test(reply.body)
    )
    if (hasFailureReply) {
      continue
    }

    for (const job of getJobsForMessage(agentJobs, message.id)) {
      if (job.status === "failed") {
        failed[message.id] = {
          agent: job.agent_name,
          error: job.error?.trim() || "Codex failed without details.",
        }
      }
    }
  }

  return failed
}

export function ChannelFeed({
  channel,
  slug,
  workspaceId,
  projectId,
  members,
  canEdit,
}: ChannelFeedProps) {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(postChannelMessage, {})
  const formRef = useRef<HTMLFormElement>(null)
  const messagesScrollRef = useRef<HTMLDivElement>(null)
  const submitBodyRef = useRef<string | null>(null)
  const [optimisticPending, setOptimisticPending] = useState<Record<string, AgentName[]>>({})

  const refreshChannel = useCallback(() => {
    router.refresh()
  }, [router])

  const { jobs: agentJobs, hasActiveJobs } = useChannelAgentsLive({
    channelId: channel.id,
    onJobsChange: refreshChannel,
  })

  const initialAwaitingPersonal = useMemo(
    () => channel.messages.some((message) => personalAwaitingFinalReply(message)),
    [channel.messages]
  )

  const { messages: liveMessages } = useChannelMessagesLive({
    channelId: channel.id,
    initialMessages: channel.messages,
    poll: hasActiveJobs || initialAwaitingPersonal,
  })

  const awaitingPersonalReply = useMemo(
    () => liveMessages.some((message) => personalAwaitingFinalReply(message)),
    [liveMessages]
  )

  const derivedPending = useMemo(
    () => derivePendingAgents(liveMessages, agentJobs),
    [agentJobs, liveMessages]
  )

  const failedAgents = useMemo(
    () => deriveFailedAgents(liveMessages, agentJobs),
    [agentJobs, liveMessages]
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
  const hasPendingAgents = Object.keys(pendingAgents).length > 0 || hasActiveJobs || awaitingPersonalReply

  useEffect(() => {
    if (state.success) {
      router.refresh()
    }
  }, [router, state.success])

  useEffect(() => {
    if (!hasPendingAgents) {
      return
    }

    const intervalId = window.setInterval(() => {
      router.refresh()
    }, 3000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [hasPendingAgents, router])

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
        if (derivedPending[messageId]?.length) {
          continue
        }
        delete next[messageId]
        changed = true
      }

      return changed ? next : current
    })
  }, [channel.messages, derivedPending])

  useEffect(() => {
    const container = messagesScrollRef.current
    if (!container) {
      return
    }

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    })
  }, [liveMessages.length, hasPendingAgents])

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border/60 px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">{channel.name}</h2>
          {channel.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{channel.description}</p>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          ref={messagesScrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6"
        >
          <div className="space-y-4">
          {liveMessages.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-10 text-center">
              <h3 className="text-sm font-medium">No messages yet</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Start the conversation in #{channel.name.toLowerCase()}.
              </p>
            </div>
          ) : (
            liveMessages.map((message) => (
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
                failedAgent={failedAgents[message.id] ?? null}
              />
            ))
          )}
          </div>
        </div>

        {canEdit ? (
          <div className="shrink-0 border-t border-border/60 bg-background p-4">
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
