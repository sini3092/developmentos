import Link from "next/link"
import { ExternalLink } from "lucide-react"

import type { RoadmapTaskItem } from "@/lib/auth/project-roadmap-context"
import { TASK_STATUS_LABELS } from "@/lib/constants/tasks"
import { ProgressBar } from "@/components/roadmap/progress-bar"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils/format"

type RoadmapTaskListProps = {
  tasks: RoadmapTaskItem[]
  slug: string
  emptyMessage: string
}

export function RoadmapTaskList({ tasks, slug, emptyMessage }: RoadmapTaskListProps) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/projects/${slug}/tasks/board?task=${task.id}`}
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-xs transition-colors hover:border-info/40 hover:bg-info/5"
        >
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{task.identifier}</span>
              <Badge variant="outline" className="font-normal">
                {TASK_STATUS_LABELS[task.status]}
              </Badge>
              {task.initiative ? (
                <span className="truncate text-xs text-muted-foreground">{task.initiative.name}</span>
              ) : null}
            </div>
            <p className="truncate text-sm font-medium">{task.title}</p>
            <p className="text-xs text-muted-foreground">
              {task.assignee_name ? `${task.assignee_name} · ` : ""}
              Updated {formatDate(task.updated_at)} · {task.progress}% checklist
            </p>
          </div>
          <div className="hidden w-24 sm:block">
            <ProgressBar value={task.progress} className="h-1.5" />
          </div>
          <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  )
}
