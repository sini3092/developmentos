import type { ActivityEvent } from "@/lib/database.types"
import {
  formatActivityEventMessage,
  formatActivityEventType,
  getActivityEventUrl,
} from "@/lib/utils/activity"

type ActivityFeedProps = {
  events: ActivityEvent[]
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-8 text-center text-sm text-muted-foreground">
        Activity will appear as your team creates tasks and posts roadmap updates.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event) => {
        const url = getActivityEventUrl(event.event_type, event.new_value)
        const content = (
          <>
            <p className="text-xs font-medium text-muted-foreground">
              {formatActivityEventType(event.event_type)}
            </p>
            <p>{formatActivityEventMessage(event.event_type, event.message, event.new_value)}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(event.created_at).toLocaleString()}
            </p>
          </>
        )

        return url ? (
          <a
            key={event.id}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-xl border border-border/60 bg-card px-4 py-3 text-sm shadow-xs transition-colors hover:border-info/40 hover:bg-info/5"
          >
            {content}
          </a>
        ) : (
          <div
            key={event.id}
            className="rounded-xl border border-border/60 bg-card px-4 py-3 text-sm shadow-xs"
          >
            {content}
          </div>
        )
      })}
    </div>
  )
}
