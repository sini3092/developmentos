import type { RoadmapListBucket } from "@/lib/utils/roadmap"
import { getBoardListColorClasses } from "@/lib/constants/board-lists"
import { cn } from "@/lib/utils"

type RoadmapStatusPipelineProps = {
  listBreakdown: RoadmapListBucket[]
  totalTasks: number
}

export function RoadmapStatusPipeline({ listBreakdown, totalTasks }: RoadmapStatusPipelineProps) {
  if (totalTasks === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-8 text-center text-sm text-muted-foreground">
        No tasks yet. Create work on the task board to populate the project roadmap.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex h-3 overflow-hidden rounded-full bg-muted">
        {listBreakdown.map((bucket) => {
          const colorClasses = getBoardListColorClasses(bucket.color)
          return (
            <div
              key={bucket.list_id ?? "unlisted"}
              className={cn("h-full transition-all", colorClasses.bar)}
              style={{ width: `${(bucket.count / totalTasks) * 100}%` }}
              title={`${bucket.list_name}: ${bucket.count}`}
            />
          )
        })}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {listBreakdown.map((bucket) => {
          const colorClasses = getBoardListColorClasses(bucket.color)
          return (
            <div
              key={bucket.list_id ?? "unlisted"}
              className="flex items-center justify-between rounded-lg border border-border/60 bg-card px-3 py-2 text-sm"
            >
              <span className="inline-flex items-center gap-2">
                <span className={cn("size-2 rounded-full", colorClasses.bar)} />
                {bucket.list_name}
              </span>
              <span className="font-medium tabular-nums">{bucket.count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
