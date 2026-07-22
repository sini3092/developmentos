"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { CheckCheck, X } from "lucide-react"

import {
  dismissNotification,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/actions/notifications"
import type { Notification } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type InboxListProps = {
  notifications: Notification[]
  workspaceId: string
}

const typeLabels: Record<Notification["type"], string> = {
  task_assigned: "Assignment",
  task_comment: "Comment",
  roadmap_update: "Roadmap",
  task_blocked: "Blocked",
  mentioned: "Mention",
  automation: "Automation",
  calendar_reminder: "Calendar",
  lore_review_requested: "Lore review",
  lore_comment: "Lore comment",
  lore_review_resolved: "Lore review",
}

export function InboxList({ notifications, workspaceId }: InboxListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (notifications.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-10 text-center text-sm text-muted-foreground">
        You&apos;re all caught up. Assignments, mentions, and roadmap updates will land here.
      </p>
    )
  }

  const unreadCount = notifications.filter((item) => !item.read_at).length

  function runAction(action: () => Promise<{ error?: string; success?: boolean }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {unreadCount > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => runAction(() => markAllNotificationsRead(workspaceId))}
          >
            <CheckCheck className="size-4" />
            Mark all read
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        {notifications.map((notification) => (
          <article
            key={notification.id}
            className={cn(
              "flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-xs",
              !notification.read_at && "border-info/30 bg-info/5"
            )}
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {typeLabels[notification.type]}
                </span>
                {!notification.read_at ? (
                  <span className="size-1.5 rounded-full bg-info" />
                ) : null}
              </div>
              <p className="font-medium">{notification.title}</p>
              {notification.body ? (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {notification.body}
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                {new Date(notification.created_at).toLocaleString()}
              </p>
              {notification.link ? (
                <Link
                  href={notification.link}
                  className="inline-block text-sm text-info hover:underline"
                  onClick={() => {
                    if (!notification.read_at) {
                      runAction(() => markNotificationRead(notification.id))
                    }
                  }}
                >
                  Open
                </Link>
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
              >
                <X className="size-4" />
              </Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
