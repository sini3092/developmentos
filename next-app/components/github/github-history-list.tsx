"use client"

import type { GithubHistoryEvent } from "@/lib/auth/github-history-context"
import { GithubActivityEventRow } from "@/components/github/github-activity-event-row"

type GithubHistoryListProps = {
  slug: string
  events: GithubHistoryEvent[]
}

export function GithubHistoryList({ slug, events }: GithubHistoryListProps) {
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
        <GithubActivityEventRow
          key={event.id}
          slug={slug}
          eventType={event.event_type}
          message={event.message}
          newValue={event.new_value}
          createdAt={event.created_at}
          actorDisplayName={event.actor?.display_name}
        />
      ))}
    </div>
  )
}
