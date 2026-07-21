import type { InitiativeTaskBreakdown } from "@/lib/utils/roadmap"
import { TASK_STATUSES, TASK_STATUS_LABELS } from "@/lib/constants/tasks"
import { cn } from "@/lib/utils"

type RoadmapStatusPipelineProps = {
  breakdown: InitiativeTaskBreakdown
  totalTasks: number
}

const PIPELINE_STATUSES = TASK_STATUSES.filter((status) => status !== "cancelled")

const STATUS_COLORS: Record<string, string> = {
  backlog: "bg-muted-foreground/30",
  ready: "bg-primary/50",
  in_progress: "bg-info",
  in_review: "bg-warning",
  blocked: "bg-danger",
  done: "bg-success",
}

export function RoadmapStatusPipeline({ breakdown, totalTasks }: RoadmapStatusPipelineProps) {
  if (totalTasks === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-8 text-center text-sm text-muted-foreground">
        No tasks yet. Create work on the board to populate the project roadmap.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {PIPELINE_STATUSES.map((status) => {
          const count = breakdown[status as keyof InitiativeTaskBreakdown] ?? 0
          if (!count) return null
          return (
            <div
              key={status}
              className={cn("h-full transition-all", STATUS_COLORS[status])}
              style={{ width: `${(count / totalTasks) * 100}%` }}
              title={`${TASK_STATUS_LABELS[status]}: ${count}`}
            />
          )
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PIPELINE_STATUSES.map((status) => {
          const count = breakdown[status as keyof InitiativeTaskBreakdown] ?? 0
          return (
            <div
              key={status}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2 text-sm"
            >
              <span className="inline-flex items-center gap-2">
                <span className={cn("size-2 rounded-full", STATUS_COLORS[status])} />
                {TASK_STATUS_LABELS[status]}
              </span>
              <span className="font-medium tabular-nums">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
