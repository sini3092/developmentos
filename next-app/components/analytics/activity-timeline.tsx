import type { ProjectAnalytics } from "@/lib/auth/analytics-context"
import {
  formatActivityEventMessage,
  formatActivityEventType,
  getActivityEventUrl,
} from "@/lib/utils/activity"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getInitials } from "@/lib/utils/format"

type ActivityTimelineProps = {
  events: ProjectAnalytics["activity"]
}

export function ActivityTimeline({ events }: ActivityTimelineProps) {
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
        const url = getActivityEventUrl(event.event_type, event.new_value)
        const content = (
          <>
            <Avatar className="size-8 rounded-md">
              <AvatarFallback className="rounded-md text-xs">
                {getInitials(
                  event.actor?.display_name,
                  event.event_type.startsWith("github.") ? "GH" : "?"
                )}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {event.actor?.display_name ??
                    (event.event_type.startsWith("github.") ? "GitHub" : "System")}
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
                {url ? " · View on GitHub" : ""}
              </p>
            </div>
          </>
        )

        return url ? (
          <a
            key={event.id}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:border-info/40 hover:bg-info/5"
          >
            {content}
          </a>
        ) : (
          <article
            key={event.id}
            className="flex gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-xs"
          >
            {content}
          </article>
        )
      })}
    </div>
  )
}
