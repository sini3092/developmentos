"use client"

import { useActionState, useEffect, useMemo, useRef, useState } from "react"
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
  if (!match || ["browse", "collections", "timeline", "world", "map", "health", "search", "drafts", "review", "archived", "graph"].includes(match[1])) {
    return null
  }
  return match[1]
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
  const bottomRef = useRef<HTMLDivElement>(null)

  const effectiveLoreSlug = attachLoreSlug ?? pathLoreSlug

  const [state, action, pending] = useActionState(sendSoulsPrivateMessage, {})

  const { messages, isWorking } = useSoulsChatLive({
    conversationId: conversation?.id ?? null,
    initialMessages,
  })

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
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isWorking])

  useEffect(() => {
    if (state.success) {
      setBody("")
      setAttachLoreSlug(null)
    }
  }, [state.success, setAttachLoreSlug])

  const placeholder = useMemo(() => {
    if (effectiveLoreSlug) {
      return "Ask Souls to structure this lore, place it in the world, or create tasks…"
    }
    return "Ask Souls privately — paste lore docs, structure regions, or create tasks…"
  }, [effectiveLoreSlug])

  if (!open) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        showCloseButton={false}
      >
        <SheetHeader className="border-b border-border/60 px-4 py-3">
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
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Summoning Souls…
          </div>
        ) : (
          <>
            <SoulsMessageList messages={messages} />
            <div ref={bottomRef} />
          </>
        )}

        <div className="border-t border-border/60 p-4">
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
            <form action={action} className="space-y-2">
              <input type="hidden" name="workspaceId" value={activeWorkspace.id} />
              <input type="hidden" name="projectId" value={project.id} />
              <input type="hidden" name="projectSlug" value={project.slug} />
              {effectiveLoreSlug ? (
                <input type="hidden" name="attachLoreSlug" value={effectiveLoreSlug} />
              ) : null}
              <Textarea
                name="body"
                value={body}
                onChange={(event) => setBody(event.target.value)}
                placeholder={placeholder}
                rows={3}
                disabled={pending || isWorking}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
              />
              {state.error ? <p className="text-xs text-danger">{state.error}</p> : null}
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={pending || isWorking || !body.trim()}>
                  <Send className="size-4" />
                  {isWorking ? "Souls is working…" : "Send"}
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
