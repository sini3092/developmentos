import Link from "next/link"

import type { RoadmapSnapshotItem } from "@/lib/auth/dashboard-context"
import { HealthBadge } from "@/components/roadmap/health-badge"
import { ProgressBar } from "@/components/roadmap/progress-bar"
import {
  INITIATIVE_STATUS_LABELS,
  PLANNING_HORIZON_LABELS,
} from "@/lib/constants/roadmap"
import {
  PROJECT_COLOR_CLASSES,
  type ProjectColor,
} from "@/lib/constants/projects"

type RoadmapSnapshotProps = {
  initiatives: RoadmapSnapshotItem[]
}

export function RoadmapSnapshot({ initiatives }: RoadmapSnapshotProps) {
  if (initiatives.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-8 text-center text-sm text-muted-foreground">
        Create initiatives on a project roadmap to see progress here.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {initiatives.map((initiative) => {
        const colorClass =
          PROJECT_COLOR_CLASSES[initiative.project.color as ProjectColor] ??
          PROJECT_COLOR_CLASSES.blue

        return (
          <Link
            key={initiative.id}
            href={`/projects/${initiative.project.slug}/roadmap/${initiative.slug}`}
            className="block rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:border-border hover:bg-surface-raised/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`size-2 shrink-0 rounded-full ${colorClass}`} />
                  <p className="truncate font-medium">{initiative.name}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {initiative.project.name} · {PLANNING_HORIZON_LABELS[initiative.planning_horizon]}
                </p>
              </div>
              <HealthBadge health={initiative.health} />
            </div>
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{INITIATIVE_STATUS_LABELS[initiative.status]}</span>
                <span className="tabular-nums">{initiative.progress}%</span>
              </div>
              <ProgressBar value={initiative.progress} />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
