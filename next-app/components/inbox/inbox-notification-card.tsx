"use client"

import Link from "next/link"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { CheckCheck, X } from "lucide-react"

import { dismissNotification, markNotificationRead } from "@/lib/actions/notifications"
import type { Notification } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
  souls_game_status: "Souls",
}

type InboxNotificationCardProps = {
  notification: Notification
  onActionComplete?: () => void
}

export function InboxNotificationCard({
  notification,
  onActionComplete,
}: InboxNotificationCardProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function runAction(action: () => Promise<{ error?: string; success?: boolean }>) {
    startTransition(async () => {
      const result = await action()
      if (!result.error) {
        onActionComplete?.()
        router.refresh()
      }
    })
  }

  return (
    <article
      className={cn(
        "flex items-start gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-xs",
        !notification.read_at && "border-info/30 bg-info/5"
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {typeLabels[notification.type]}
          </span>
          {!notification.read_at ? <span className="size-1.5 rounded-full bg-info" /> : null}
        </div>
        <p className="font-medium">{notification.title}</p>
        {notification.body ? (
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{notification.body}</p>
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
  )
}
