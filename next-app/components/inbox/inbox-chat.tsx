"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { Archive, Send } from "lucide-react"

import {
  archiveInboxThreadAction,
  markInboxThreadReadAction,
  sendInboxMessage,
  startDirectInboxThread,
} from "@/lib/actions/inbox"
import { SoulsAvatar } from "@/components/souls/souls-avatar"
import { SoulsActionCard } from "@/components/souls/souls-action-card"
import { SoulsInboxMessageBody } from "@/components/inbox/souls-inbox-message-body"
import type { InboxMessage, InboxThreadListItem } from "@/lib/inbox/types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { Json } from "@/lib/database.types"
import { cn } from "@/lib/utils"
import { parseSoulsMessageMetadata } from "@/lib/souls/message-metadata"

type InboxChatProps = {
  workspaceId: string
  userId: string
  threads: InboxThreadListItem[]
  members: Array<{ user_id: string; display_name: string | null }>
  selectedThreadId: string | null
  selectedThread: InboxThreadListItem | null
  messages: InboxMessage[]
  projectSlug: string | null
  projectId: string | null
  peerName: string | null
}

function threadLabel(thread: InboxThreadListItem) {
  if (thread.kind === "souls_report") {
    return `Souls #${thread.souls_report_number ?? "?"}`
  }
  return thread.peer_name ?? thread.title
}

export function InboxChat({
  workspaceId,
  userId,
  threads,
  members,
  selectedThreadId,
  selectedThread,
  messages,
  projectSlug,
  projectId,
  peerName,
}: InboxChatProps) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()
  const [dmError, setDmError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedThreadId) {
      startTransition(async () => {
        await markInboxThreadReadAction(selectedThreadId)
        router.refresh()
      })
    }
  }, [selectedThreadId, router])

  const soulsWorking = messages.some((message) => message.status === "working")

  useEffect(() => {
    if (!soulsWorking) return
    const timer = window.setInterval(() => router.refresh(), 2500)
    return () => window.clearInterval(timer)
  }, [soulsWorking, router])

  const teammates = useMemo(
    () => members.filter((member) => member.user_id !== userId),
    [members, userId]
  )

  function sendMessage() {
    if (!selectedThread || !body.trim()) return

    const formData = new FormData()
    formData.set("threadId", selectedThread.id)
    formData.set("body", body.trim())
    formData.set("workspaceId", workspaceId)
    formData.set("threadKind", selectedThread.kind)
    if (projectId) formData.set("projectId", projectId)
    if (projectSlug) formData.set("projectSlug", projectSlug)

    startTransition(async () => {
      const result = await sendInboxMessage({}, formData)
      if (!result.error) {
        setBody("")
        router.refresh()
      }
    })
  }

  return (
    <div className="grid h-[min(78vh,900px)] min-h-[520px] grid-cols-1 overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xs lg:grid-cols-[300px_1fr]">
      <aside className="flex min-h-0 flex-col border-b border-border/60 lg:border-r lg:border-b-0">
        <div className="border-b border-border/60 p-3">
          <p className="text-sm font-medium">Conversations</p>
          <p className="text-xs text-muted-foreground">Souls reports · teammate DMs</p>
        </div>

        {teammates.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-b border-border/60 p-3">
            {dmError ? (
              <p className="w-full text-xs text-danger">{dmError}</p>
            ) : null}
            {teammates.map((member) => (
              <Button
                key={member.user_id}
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending}
                onClick={() => {
                  setDmError(null)
                  const formData = new FormData()
                  formData.set("workspaceId", workspaceId)
                  formData.set("peerUserId", member.user_id)
                  formData.set("peerName", member.display_name ?? "Teammate")
                  startTransition(async () => {
                    const result = await startDirectInboxThread({}, formData)
                    if (result.error) {
                      setDmError(result.error)
                      return
                    }
                    if (result.threadId) {
                      router.push(`/inbox?t=${result.threadId}`)
                      router.refresh()
                    }
                  })
                }}
              >
                {member.display_name ?? "Teammate"}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {threads.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              No conversations yet. Souls will appear here after GAME_STATUS sync.
            </p>
          ) : (
            <div className="space-y-1">
              {threads.map((thread) => (
                <Link
                  key={thread.id}
                  href={`/inbox?t=${thread.id}`}
                  className={cn(
                    "flex items-start gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50",
                    selectedThreadId === thread.id && "bg-muted",
                    thread.unread && "bg-violet-500/5"
                  )}
                >
                  {thread.kind === "souls_report" ? (
                    <SoulsAvatar size="sm" />
                  ) : (
                    <Avatar className="size-9">
                      <AvatarFallback>
                        {(thread.peer_name ?? "T").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{threadLabel(thread)}</p>
                      {thread.unread ? <span className="size-2 rounded-full bg-violet-500" /> : null}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{thread.preview}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-h-0 flex-col">
        {!selectedThread ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
            Select a conversation to read and reply.
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3">
              <div className="flex items-center gap-3">
                {selectedThread.kind === "souls_report" ? (
                  <SoulsAvatar size="sm" />
                ) : (
                  <Avatar className="size-9">
                    <AvatarFallback>{(peerName ?? "T").slice(0, 1)}</AvatarFallback>
                  </Avatar>
                )}
                <div>
                  <p className="font-medium">{threadLabel(selectedThread)}</p>
                  {selectedThread.kind === "souls_report" ? (
                    <p className="text-xs text-muted-foreground">
                      {selectedThread.metadata.branch ?? "main"} ·{" "}
                      {(selectedThread.metadata.commit_sha as string | undefined)?.slice(0, 7) ??
                        "commit"}{" "}
                      · {new Date(selectedThread.created_at).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Private teammate chat</p>
                  )}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    await archiveInboxThreadAction(selectedThread.id)
                    router.push("/inbox")
                    router.refresh()
                  })
                }
              >
                <Archive className="size-4" />
                Archive
              </Button>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((message) => {
                const isUser = message.sender_kind === "user" && message.sender_user_id === userId
                const isSouls = message.sender_kind === "souls"
                const soulsMetadata = parseSoulsMessageMetadata(message.metadata as Json)

                return (
                  <div key={message.id} className={cn("flex", isUser ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%] space-y-2", isUser ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "rounded-2xl px-3.5 py-2.5 text-sm",
                          isUser
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md border border-border/60 bg-background"
                        )}
                      >
                      {isSouls &&
                      typeof message.metadata?.title === "string" &&
                      !(
                        selectedThread.kind === "souls_report" &&
                        messages[0]?.id === message.id
                      ) ? (
                        <p className="mb-2 font-medium">{String(message.metadata.title)}</p>
                      ) : null}
                      {message.status === "working" ? (
                        <p className="text-muted-foreground italic">
                          {String(
                            (message.metadata as { workingLabel?: string })?.workingLabel ??
                              "Souls is considering…"
                          )}
                        </p>
                      ) : isSouls && selectedThread.kind === "souls_report" && messages[0]?.id === message.id ? (
                        <SoulsInboxMessageBody
                          body={message.body}
                          createdAt={message.created_at}
                          title={
                            typeof message.metadata?.title === "string"
                              ? message.metadata.title
                              : null
                          }
                          compact={false}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap">{message.body}</p>
                      )}
                      </div>
                      {soulsMetadata.actions?.map((action, index) => (
                        <SoulsActionCard key={`${message.id}-action-${index}`} action={action} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <footer className="border-t border-border/60 p-4">
              <div className="flex gap-2">
                <Textarea
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={
                    selectedThread.kind === "souls_report"
                      ? "Reply to Souls about this report…"
                      : `Message ${peerName ?? "teammate"}…`
                  }
                  rows={2}
                  className="min-h-[72px] resize-none"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      sendMessage()
                    }
                  }}
                />
                <Button type="button" disabled={isPending || !body.trim()} onClick={sendMessage}>
                  <Send className="size-4" />
                </Button>
              </div>
            </footer>
          </>
        )}
      </section>
    </div>
  )
}
