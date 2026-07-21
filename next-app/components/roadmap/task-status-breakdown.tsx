import type { InitiativeTaskBreakdown } from "@/lib/utils/roadmap"
import { cn } from "@/lib/utils"

type TaskStatusBreakdownProps = {
  breakdown: InitiativeTaskBreakdown
  className?: string
}

const SEGMENTS: Array<{
  key: keyof InitiativeTaskBreakdown
  className: string
  label: string
}> = [
  { key: "done", className: "bg-success", label: "Complete" },
  { key: "in_progress", className: "bg-info", label: "In progress" },
  { key: "backlog", className: "bg-muted-foreground/30", label: "Not started" },
]

export function TaskStatusBreakdown({ breakdown, className }: TaskStatusBreakdownProps) {
  const total = SEGMENTS.reduce((sum, segment) => sum + (breakdown[segment.key] ?? 0), 0)

  if (total === 0) {
    return (
      <div
        className={cn(
          "h-2 overflow-hidden rounded-full border border-dashed border-border/80 bg-muted/30",
          className
        )}
      />
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {SEGMENTS.map((segment) => {
          const count = breakdown[segment.key]
          if (!count) return null
          return (
            <div
              key={segment.key}
              className={cn("h-full transition-all", segment.className)}
              style={{ width: `${(count / total) * 100}%` }}
              title={`${segment.label}: ${count}`}
            />
          )
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        {SEGMENTS.map((segment) => {
          const count = breakdown[segment.key]
          if (!count) return null
          return (
            <span key={segment.key} className="inline-flex items-center gap-1.5">
              <span className={cn("size-1.5 rounded-full", segment.className)} />
              {count} {segment.label.toLowerCase()}
            </span>
          )
        })}
      </div>
    </div>
  )
}
