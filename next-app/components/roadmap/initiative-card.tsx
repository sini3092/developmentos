import type { InitiativeWithOwner } from "@/lib/database.types"
import {
  INITIATIVE_STATUS_LABELS,
  PLANNING_HORIZON_LABELS,
} from "@/lib/constants/roadmap"
import { HealthBadge } from "@/components/roadmap/health-badge"
import { ProgressBar } from "@/components/roadmap/progress-bar"
import { Badge } from "@/components/ui/badge"
import { Calendar, ListTodo, Milestone } from "lucide-react"
import Link from "next/link"
import { formatDate } from "@/lib/utils/format"

type InitiativeCardProps = {
  initiative: InitiativeWithOwner
  slug: string
}

export function InitiativeCard({ initiative, slug }: InitiativeCardProps) {
  const done = initiative.task_done_count ?? 0
  const open = initiative.task_open_count ?? 0

  return (
    <Link
      href={`/projects/${slug}/roadmap/${initiative.slug}`}
      className="block rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:border-border hover:bg-surface-raised/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <h3 className="truncate font-medium">{initiative.name}</h3>
          {initiative.summary ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{initiative.summary}</p>
          ) : null}
        </div>
        <HealthBadge health={initiative.health} />
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progress (from tasks)</span>
          <span className="tabular-nums">{initiative.progress}%</span>
        </div>
        <ProgressBar value={initiative.progress} />
        {initiative.task_count > 0 ? (
          <p className="text-xs text-muted-foreground">
            {done} done · {open} remaining
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Link tasks to this initiative to track work</p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{INITIATIVE_STATUS_LABELS[initiative.status]}</Badge>
        <Badge variant="outline">{PLANNING_HORIZON_LABELS[initiative.planning_horizon]}</Badge>
        {initiative.milestone_count > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Milestone className="size-3" />
            {initiative.milestone_count}
          </span>
        ) : null}
        {initiative.task_count > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <ListTodo className="size-3" />
            {initiative.task_count}
          </span>
        ) : null}
        {initiative.target_completion ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="size-3" />
            {formatDate(initiative.target_completion)}
          </span>
        ) : null}
      </div>
    </Link>
  )
}
