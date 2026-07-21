"use client"

import Link from "next/link"
import { CheckCircle2, GitBranch } from "lucide-react"

import type { RoadmapActivityItem } from "@/lib/auth/project-roadmap-context"
import { GithubActivityEventRow } from "@/components/github/github-activity-event-row"
import { Badge } from "@/components/ui/badge"

type RoadmapProjectActivityProps = {
  items: RoadmapActivityItem[]
  slug: string
}

export function RoadmapProjectActivity({ items, slug }: RoadmapProjectActivityProps) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-8 text-center text-sm text-muted-foreground">
        No recent activity yet. Complete tasks or push code to GitHub to see updates here.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item) => {
        if (item.kind === "github") {
          return (
            <GithubActivityEventRow
              key={item.id}
              eventType={item.event.event_type}
              message={item.event.message}
              newValue={item.event.new_value}
              createdAt={item.event.created_at}
              actorDisplayName={item.event.actor?.display_name ?? "GitHub"}
              compact
            />
          )
        }

        return (
          <Link
            key={item.id}
            href={`/projects/${slug}/tasks/board?task=${item.task.id}`}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 text-sm shadow-xs transition-colors hover:border-success/40 hover:bg-success/5"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-success/10 text-success">
              <CheckCircle2 className="size-4" />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="font-normal">
                  Task completed
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  {item.task.identifier}
                </span>
              </div>
              <p className="font-medium">{item.task.title}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(item.created_at).toLocaleString()}
                {item.task.initiative ? ` · ${item.task.initiative.name}` : ""}
              </p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

type RoadmapGithubActivityProps = {
  items: RoadmapActivityItem[]
  slug: string
  pushCount: number
  pullRequestCount: number
}

export function RoadmapGithubSection({
  items,
  slug,
  pushCount,
  pullRequestCount,
}: RoadmapGithubActivityProps) {
  const githubOnly = items.filter((item) => item.kind === "github")

  if (githubOnly.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-8 text-center text-sm text-muted-foreground">
        Connect a GitHub repo in settings to record pushes, commits, and pull requests here.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1">
          <GitBranch className="size-3" />
          {pushCount} push{pushCount === 1 ? "" : "es"}
        </span>
        {pullRequestCount > 0 ? (
          <span className="rounded-md bg-muted px-2 py-1">
            {pullRequestCount} pull request{pullRequestCount === 1 ? "" : "s"}
          </span>
        ) : null}
        <Link href={`/projects/${slug}/github`} className="text-info hover:underline">
          Full GitHub history
        </Link>
      </div>
      <div className="space-y-2">
        {githubOnly.slice(0, 10).map((item) =>
          item.kind === "github" ? (
            <GithubActivityEventRow
              key={item.id}
              eventType={item.event.event_type}
              message={item.event.message}
              newValue={item.event.new_value}
              createdAt={item.event.created_at}
              actorDisplayName={item.event.actor?.display_name ?? "GitHub"}
              compact
            />
          ) : null
        )}
      </div>
    </div>
  )
}
