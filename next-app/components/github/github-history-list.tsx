import type { GithubHistoryEvent } from "@/lib/auth/github-history-context"
import {
  formatActivityEventMessage,
  formatActivityEventType,
} from "@/lib/utils/activity"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { getInitials } from "@/lib/utils/format"

type GithubHistoryListProps = {
  events: GithubHistoryEvent[]
}

export function GithubHistoryList({ events }: GithubHistoryListProps) {
  if (events.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-8 text-center text-sm text-muted-foreground">
        GitHub activity will show up here after you connect a repo and push changes.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <article
          key={event.id}
          className="flex gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-xs"
        >
          <Avatar className="size-8 rounded-md">
            <AvatarFallback className="rounded-md text-xs">
              {getInitials(event.actor?.display_name, "GH")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">
                {event.actor?.display_name ?? "GitHub"}
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
      ))}
    </div>
  )
}
