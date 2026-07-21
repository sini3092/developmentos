"use client"

import type { ProjectAnalytics } from "@/lib/auth/analytics-context"
import { GithubActivityEventRow } from "@/components/github/github-activity-event-row"
import {
  formatActivityEventMessage,
  formatActivityEventType,
  isGithubActivityEvent,
} from "@/lib/utils/activity"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getInitials } from "@/lib/utils/format"

type ActivityTimelineProps = {
  slug: string
  events: ProjectAnalytics["activity"]
}

export function ActivityTimeline({ slug, events }: ActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-8 text-center text-sm text-muted-foreground">
        Activity will appear as your team creates tasks, updates roadmaps, and ships work.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event) => {
        if (isGithubActivityEvent(event.event_type)) {
          return (
            <GithubActivityEventRow
              key={event.id}
              slug={slug}
              eventType={event.event_type}
              message={event.message}
              newValue={event.new_value}
              createdAt={event.created_at}
              actorDisplayName={
                event.actor?.display_name ??
                (event.event_type.startsWith("github.") ? "GitHub" : undefined)
              }
            />
          )
        }

        return (
          <article
            key={event.id}
            className="flex gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-xs"
          >
            <Avatar className="size-8 rounded-md">
              <AvatarFallback className="rounded-md text-xs">
                {getInitials(event.actor?.display_name, "?")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {event.actor?.display_name ?? "System"}
                </span>
                <Badge variant="outline" className="font-normal">
                  {formatActivityEventType(event.event_type)}
                </Badge>
              </div>
              <p className="text-sm">
                {formatActivityEventMessage(event.event_type, event.message, event.new_value)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(event.created_at).toLocaleString()}
              </p>
            </div>
          </article>
        )
      })}
    </div>
  )
}
