import Link from "next/link"
import { ArrowUpRight } from "lucide-react"

import type { InitiativeWithOwner } from "@/lib/database.types"
import { HealthBadge } from "@/components/roadmap/health-badge"
import { ProgressBar } from "@/components/roadmap/progress-bar"
import { TaskStatusBreakdown } from "@/components/roadmap/task-status-breakdown"
import { deriveDisplayHealth } from "@/lib/utils/roadmap"

type InitiativeCardProps = {
  initiative: InitiativeWithOwner
  slug: string
}

export function InitiativeCard({ initiative, slug }: InitiativeCardProps) {
  const breakdown = initiative.task_status_breakdown
  const displayHealth = deriveDisplayHealth(
    initiative.health,
    breakdown,
    initiative.task_count
  )
  const hasTasks = initiative.task_count > 0

  return (
    <Link
      href={`/projects/${slug}/roadmap/${initiative.slug}`}
      className="block rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:border-info/40 hover:bg-info/5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-medium">{initiative.name}</h3>
            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
          </div>
          {initiative.summary ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{initiative.summary}</p>
          ) : null}
        </div>
        <HealthBadge health={displayHealth} />
      </div>

      <div className="mt-4 space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="text-2xl font-semibold tabular-nums">{initiative.progress}%</p>
          </div>
          {hasTasks ? (
            <p className="text-xs text-muted-foreground">
              {initiative.task_done_count} done · {initiative.task_open_count} left
            </p>
          ) : null}
        </div>

        <ProgressBar value={initiative.progress} className="h-2" />

        {hasTasks && breakdown ? (
          <TaskStatusBreakdown breakdown={breakdown} />
        ) : null}

        {initiative.recent_tasks && initiative.recent_tasks.length > 0 ? (
          <ul className="space-y-1.5">
            {initiative.recent_tasks.map((task) => (
              <li
                key={task.id}
                className="flex items-center justify-between gap-2 rounded-md bg-muted/30 px-2.5 py-1.5 text-xs"
              >
                <span className="min-w-0 truncate">
                  <span className="font-mono text-muted-foreground">{task.identifier}</span>{" "}
                  {task.title}
                </span>
                <span className="shrink-0 text-muted-foreground">
                  {Math.max(0, 100 - task.progress)}% left
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Link>
  )
}
