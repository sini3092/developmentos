"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState, useTransition } from "react"
import { CheckCheck } from "lucide-react"

import { InboxNotificationCard } from "@/components/inbox/inbox-notification-card"
import { SoulsInboxCard } from "@/components/inbox/souls-inbox-card"
import { markAllNotificationsRead } from "@/lib/actions/notifications"
import type { Notification } from "@/lib/database.types"
import { Button } from "@/components/ui/button"

type InboxListProps = {
  notifications: Notification[]
  workspaceId: string
  projectsById: Record<string, { name: string; slug: string }>
  openNotificationId?: string | null
}

export function InboxList({
  notifications,
  workspaceId,
  projectsById,
  openNotificationId,
}: InboxListProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const soulsCount = useMemo(
    () => notifications.filter((item) => item.type === "souls_game_status").length,
    [notifications]
  )

  useEffect(() => {
    if (!openNotificationId) {
      return
    }

    const element = document.getElementById(`inbox-${openNotificationId}`)
    element?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [openNotificationId])

  if (notifications.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-10 text-center text-sm text-muted-foreground">
        You&apos;re all caught up. Assignments, mentions, Souls GAME_STATUS reviews, and roadmap
        updates will land here.
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
    <div className="mx-auto w-full max-w-3xl space-y-4">
      {error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {soulsCount > 0 ? (
        <p className="text-sm text-muted-foreground">
          <span className="font-serif font-medium text-foreground">Souls</span> sends reports from
          the cloud when GAME_STATUS.md changes — read the full message here before jumping to the
          board.
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

      <div className="space-y-3">
        {notifications.map((notification) => {
          const project =
            notification.entity_id && projectsById[notification.entity_id]
              ? projectsById[notification.entity_id]
              : null

          if (notification.type === "souls_game_status") {
            return (
              <SoulsInboxCard
                key={notification.id}
                notification={notification}
                projectName={project?.name}
                projectSlug={project?.slug}
                defaultExpanded={openNotificationId === notification.id}
              />
            )
          }

          return <InboxNotificationCard key={notification.id} notification={notification} />
        })}
      </div>
    </div>
  )
}
