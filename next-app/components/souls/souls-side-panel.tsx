"use client"

import { useActionState, useEffect, useMemo, useState, type FormEvent } from "react"
import { usePathname } from "next/navigation"
import { Lock, Send, Sparkles, X } from "lucide-react"

import { SoulsMessageList } from "@/components/souls/souls-message-list"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { loadSoulsPrivateChat, sendSoulsPrivateMessage } from "@/lib/actions/souls-chat"
import type { SoulsPrivateConversation, SoulsPrivateMessage } from "@/lib/database.types"
import { useSoulsChatLive } from "@/hooks/use-souls-chat-live"
import { useUiStore } from "@/lib/stores/ui-store"

function projectSlugFromPath(pathname: string) {
  const match = pathname.match(/^\/projects\/([^/]+)/)
  return match?.[1] ?? null
}

function loreSlugFromPath(pathname: string) {
  const match = pathname.match(/^\/projects\/[^/]+\/lore\/([^/]+)(?:\/|$)/)
  if (
    !match ||
    [
      "browse",
      "collections",
      "timeline",
      "world",
      "map",
      "health",
      "search",
      "drafts",
      "review",
      "archived",
      "graph",
    ].includes(match[1])
  ) {
    return null
  }
  return match[1]
}

function mergeMessages(
  live: SoulsPrivateMessage[],
  optimistic: SoulsPrivateMessage[]
) {
  if (optimistic.length === 0) {
    return live
  }

  const liveIds = new Set(live.map((message) => message.id))
  const liveBodies = new Set(live.map((message) => message.body))
  const pending = optimistic.filter(
    (message) => !liveIds.has(message.id) && !liveBodies.has(message.body)
  )

  return [...live, ...pending].sort(
    (left, right) => left.created_at.localeCompare(right.created_at)
  )
}

export function SoulsSidePanel() {
  const pathname = usePathname()
  const { activeWorkspace, projects } = useWorkspace()
  const open = useUiStore((state) => state.soulsPanelOpen)
  const setOpen = useUiStore((state) => state.setSoulsPanelOpen)
  const attachLoreSlug = useUiStore((state) => state.soulsAttachLoreSlug)
  const setAttachLoreSlug = useUiStore((state) => state.setSoulsAttachLoreSlug)

  const projectSlug = projectSlugFromPath(pathname)
  const pathLoreSlug = loreSlugFromPath(pathname)
  const project = projects.find((item) => item.slug === projectSlug)

  const [conversation, setConversation] = useState<SoulsPrivateConversation | null>(null)
  const [initialMessages, setInitialMessages] = useState<SoulsPrivateMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [body, setBody] = useState("")
  const [optimisticMessages, setOptimisticMessages] = useState<SoulsPrivateMessage[]>([])

  const effectiveLoreSlug = attachLoreSlug ?? pathLoreSlug

  const [state, action, pending] = useActionState(sendSoulsPrivateMessage, {})

  const {
    messages: liveMessages,
    reloadMessages,
    isWorking,
    isStaleWorking,
    releasing,
    releaseSouls,
  } = useSoulsChatLive({
    conversationId: conversation?.id ?? null,
    initialMessages,
  })

  const messages = useMemo(
    () => mergeMessages(liveMessages, optimisticMessages),
    [liveMessages, optimisticMessages]
  )

  useEffect(() => {
    if (!open || !project || !activeWorkspace) {
      return
    }

    let cancelled = false
    setLoading(true)

    void loadSoulsPrivateChat(project.id, project.slug, activeWorkspace.id).then((data) => {
      if (cancelled) {
        return
      }
      if (data) {
        setConversation(data.conversation)
        setInitialMessages(data.messages)
      }
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [open, project, activeWorkspace])

  useEffect(() => {
    if (!state.success) {
      return
    }

    setOptimisticMessages([])
    setAttachLoreSlug(null)
    void reloadMessages()
  }, [state.success, setAttachLoreSlug, reloadMessages])

  useEffect(() => {
    setOptimisticMessages((current) =>
      current.filter((message) => !liveMessages.some((live) => live.body === message.body))
    )
  }, [liveMessages])

  const placeholder = useMemo(() => {
    if (effectiveLoreSlug) {
      return "Ask Souls to structure this lore, place it in the world, or create tasks…"
    }
    return "Ask Souls privately — paste lore docs, structure regions, or create tasks…"
  }, [effectiveLoreSlug])

  const submitMessage = () => {
    const text = body.trim()
    if (!text || !conversation || !project || !activeWorkspace || pending || isWorking) {
      return
    }

    const now = new Date().toISOString()
    setOptimisticMessages((current) => [
      ...current,
      {
        id: `optimistic-${now}`,
        conversation_id: conversation.id,
        role: "user" as const,
        body: text,
        status: "complete",
        metadata: effectiveLoreSlug
          ? {
              attachedLore: {
                name: effectiveLoreSlug,
                slug: effectiveLoreSlug,
                entryType: "lore",
              },
            }
          : {},
        created_at: now,
      },
    ])
    setBody("")

    const formData = new FormData()
    formData.set("workspaceId", activeWorkspace.id)
    formData.set("projectId", project.id)
    formData.set("projectSlug", project.slug)
    if (effectiveLoreSlug) {
      formData.set("attachLoreSlug", effectiveLoreSlug)
    }
    formData.set("body", text)
    void action(formData)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    submitMessage()
  }

  if (!open) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <SheetHeader className="shrink-0 border-b border-border/60 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <SheetTitle className="flex items-center gap-2 font-serif text-lg">
                <Sparkles className="size-4 text-primary" />
                Souls
              </SheetTitle>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="size-3" />
                Private — only you can see this
              </p>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)}>
              <X className="size-4" />
            </Button>
          </div>
          {project ? (
            <p className="text-left text-xs text-muted-foreground">{project.name}</p>
          ) : (
            <p className="text-left text-xs text-warning">
              Open a project to chat with Souls about lore and tasks.
            </p>
          )}
        </SheetHeader>

        {loading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-muted-foreground">
            Summoning Souls…
          </div>
        ) : (
          <SoulsMessageList messages={messages} />
        )}

        <div className="shrink-0 border-t border-border/60 p-4">
          {effectiveLoreSlug ? (
            <div className="mb-2 flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
              <span>
                Attaching lore: <strong>{effectiveLoreSlug}</strong>
              </span>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setAttachLoreSlug(null)}
              >
                Remove
              </button>
            </div>
          ) : null}

          {!project || !activeWorkspace ? (
            <p className="text-sm text-muted-foreground">
              Navigate to a project to start a private Souls session.
            </p>
          ) : (
            <form className="space-y-2" onSubmit={handleSubmit}>
              {isStaleWorking ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs">
                  <span className="text-warning">Souls seems stuck. Release the chat to continue.</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={releasing}
                    onClick={() => void releaseSouls()}
                  >
                    {releasing ? "Releasing…" : "Release chat"}
                  </Button>
                </div>
              ) : null}
              <Textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={placeholder}
                rows={3}
                disabled={pending || isWorking || releasing}
                className="max-h-36 min-h-16 resize-none overflow-y-auto [field-sizing:fixed]"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    submitMessage()
                  }
                }}
              />
              {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
              <div className="flex justify-end gap-2">
                {isWorking ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={releasing}
                    onClick={() => void releaseSouls()}
                  >
                    Stop
                  </Button>
                ) : null}
                <Button
                  type="submit"
                  size="sm"
                  disabled={pending || isWorking || releasing || !body.trim()}
                >
                  <Send className="size-4" />
                  {isWorking || pending ? "Souls is working…" : "Send"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function useOpenSoulsWithLore() {
  const setOpen = useUiStore((state) => state.setSoulsPanelOpen)
  const setAttachLoreSlug = useUiStore((state) => state.setSoulsAttachLoreSlug)

  return (entrySlug: string) => {
    setAttachLoreSlug(entrySlug)
    setOpen(true)
  }
}
