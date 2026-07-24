"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCheck, ChevronDown, ChevronUp, MessageCircle, X } from "lucide-react"

import { SoulsInboxMessageBody } from "@/components/inbox/souls-inbox-message-body"
import { SoulsAvatar, SOULS_DISPLAY_NAME, SOULS_TAGLINE } from "@/components/souls/souls-avatar"
import { dismissNotification, markNotificationRead } from "@/lib/actions/notifications"
import type { Notification } from "@/lib/database.types"
import { useUiStore } from "@/lib/stores/ui-store"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SoulsInboxCardProps = {
  notification: Notification
  projectName?: string | null
  projectSlug?: string | null
  defaultExpanded?: boolean
  onActionComplete?: () => void
}

export function SoulsInboxCard({
  notification,
  projectName,
  projectSlug,
  defaultExpanded = false,
  onActionComplete,
}: SoulsInboxCardProps) {
  const router = useRouter()
  const setSoulsOpen = useUiStore((state) => state.setSoulsPanelOpen)
  const [expanded, setExpanded] = useState(defaultExpanded || !notification.read_at)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (defaultExpanded) {
      setExpanded(true)
    }
  }, [defaultExpanded])

  function runAction(action: () => Promise<{ error?: string; success?: boolean }>) {
    startTransition(async () => {
      const result = await action()
      if (!result.error) {
        onActionComplete?.()
        router.refresh()
      }
    })
  }

  const boardHref = projectSlug ? `/projects/${projectSlug}/tasks/board` : null

  return (
    <article
      id={`inbox-${notification.id}`}
      className={cn(
        "overflow-hidden rounded-2xl border shadow-xs transition-colors",
        !notification.read_at
          ? "border-violet-500/25 bg-gradient-to-br from-violet-500/5 via-card to-cyan-500/5"
          : "border-border/60 bg-card"
      )}
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        <SoulsAvatar size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-serif text-sm font-semibold">{SOULS_DISPLAY_NAME}</p>
            {!notification.read_at ? (
              <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-violet-700 uppercase dark:text-violet-300">
                New
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{SOULS_TAGLINE}</p>
          {projectName ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {projectName} · GAME_STATUS review
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-1">
          {!notification.read_at ? (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              disabled={isPending}
              onClick={() => runAction(() => markNotificationRead(notification.id))}
              aria-label="Mark as read"
            >
              <CheckCheck className="size-4" />
            </Button>
          ) : null}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-8 text-muted-foreground"
            disabled={isPending}
            onClick={() => runAction(() => dismissNotification(notification.id))}
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 px-4 pb-4">
        <div className="rounded-xl border border-border/50 bg-background/70 p-4">
          <p className="font-medium leading-snug">{notification.title}</p>
          {notification.body ? (
            <div className="mt-3">
              <SoulsInboxMessageBody
                body={notification.body}
                createdAt={notification.created_at}
                compact={!expanded}
              />
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {notification.body ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setExpanded((value) => !value)
                if (!notification.read_at) {
                  runAction(() => markNotificationRead(notification.id))
                }
              }}
            >
              {expanded ? (
                <>
                  Show less
                  <ChevronUp className="size-4" />
                </>
              ) : (
                <>
                  Read full report
                  <ChevronDown className="size-4" />
                </>
              )}
            </Button>
          ) : null}

          {boardHref ? (
            <Button asChild variant="secondary" size="sm">
              <Link
                href={boardHref}
                onClick={() => {
                  if (!notification.read_at) {
                    runAction(() => markNotificationRead(notification.id))
                  }
                }}
              >
                View task board
              </Link>
            </Button>
          ) : null}

          {projectSlug ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSoulsOpen(true)
                if (!notification.read_at) {
                  runAction(() => markNotificationRead(notification.id))
                }
              }}
            >
              <MessageCircle className="size-4" />
              Reply to Souls
            </Button>
          ) : null}
        </div>
      </div>
    </article>
  )
}
