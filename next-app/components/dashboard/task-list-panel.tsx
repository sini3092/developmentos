import Link from "next/link"

import type { TaskWithProject } from "@/lib/auth/dashboard-context"
import { remainingPercent } from "@/lib/auth/dashboard-context"
import { TaskPriorityBadge } from "@/components/tasks/task-badges"
import { ProgressBar } from "@/components/roadmap/progress-bar"
import { Badge } from "@/components/ui/badge"
import {
  PROJECT_COLOR_CLASSES,
  type ProjectColor,
} from "@/lib/constants/projects"
import { formatDate } from "@/lib/utils/format"

type TaskListPanelProps = {
  tasks: TaskWithProject[]
  emptyMessage?: string
}

export function TaskListPanel({
  tasks,
  emptyMessage = "Nothing here yet.",
}: TaskListPanelProps) {
  if (tasks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const colorClass =
          PROJECT_COLOR_CLASSES[task.project.color as ProjectColor] ??
          PROJECT_COLOR_CLASSES.blue

        return (
          <Link
            key={task.id}
            href={`/projects/${task.project.slug}/tasks/board?task=${task.id}`}
            className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3 shadow-xs transition-colors hover:border-border hover:bg-surface-raised/50"
          >
            <span className={`mt-1.5 size-2 shrink-0 rounded-full ${colorClass}`} />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {task.identifier}
                </span>
                {task.list_name ? (
                  <Badge variant="outline" className="font-normal">
                    {task.list_name}
                  </Badge>
                ) : null}
                <TaskPriorityBadge priority={task.priority} />
              </div>
              <p className="truncate font-medium">{task.title}</p>
              <p className="text-xs text-muted-foreground">
                {task.project.name}
                {task.due_date ? ` · Due ${formatDate(task.due_date)}` : ""}
                {task.initiative ? ` · ${task.initiative.name}` : ""}
                {` · ${remainingPercent(task.progress)}% remaining`}
              </p>
            </div>
            <div className="hidden w-20 pt-1 sm:block">
              <ProgressBar value={task.progress ?? 0} className="h-1.5" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
