import Link from "next/link"
import { ExternalLink } from "lucide-react"

import type { InitiativeLinkedTask } from "@/lib/auth/roadmap-context"
import { TASK_STATUS_LABELS } from "@/lib/constants/tasks"
import { ProgressBar } from "@/components/roadmap/progress-bar"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/utils/format"

type InitiativeLinkedTasksProps = {
  tasks: InitiativeLinkedTask[]
  slug: string
}

export function InitiativeLinkedTasks({ tasks, slug }: InitiativeLinkedTasksProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-8 text-center text-sm text-muted-foreground">
        No tasks linked yet. Open a task on the{" "}
        <Link href={`/projects/${slug}/tasks/board`} className="text-info hover:underline">
          kanban board
        </Link>{" "}
        and assign it to this initiative.
      </div>
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
            </div>
            <p className="truncate text-sm font-medium">{task.title}</p>
            <p className="text-xs text-muted-foreground">
              Updated {formatDate(task.updated_at)} · {task.progress}% checklist progress
            </p>
          </div>
          <div className="hidden w-28 sm:block">
            <ProgressBar value={task.progress} className="h-1.5" />
          </div>
          <ExternalLink className="size-4 shrink-0 text-muted-foreground" />
        </Link>
      ))}
    </div>
  )
}
