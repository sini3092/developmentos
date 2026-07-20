import type { TaskPriority, TaskStatus } from "@/lib/database.types"
import {
  TASK_PRIORITY_LABELS,
  TASK_PRIORITY_TONES,
  TASK_STATUS_LABELS,
  TASK_STATUS_TONES,
} from "@/lib/constants/tasks"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const toneClasses = {
  default: "bg-secondary text-secondary-foreground",
  info: "border-info/30 bg-info/10 text-info",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-danger/30 bg-danger/10 text-danger",
} as const

export function TaskStatusBadge({
  status,
  className,
}: {
  status: TaskStatus
  className?: string
}) {
  const tone = TASK_STATUS_TONES[status]

  return (
    <Badge variant="outline" className={cn(toneClasses[tone], className)}>
      {TASK_STATUS_LABELS[status]}
    </Badge>
  )
}

export function TaskPriorityBadge({
  priority,
  className,
}: {
  priority: TaskPriority
  className?: string
}) {
  if (priority === "none") {
    return null
  }

  const tone = TASK_PRIORITY_TONES[priority]

  return (
    <Badge variant="outline" className={cn(toneClasses[tone], className)}>
      {TASK_PRIORITY_LABELS[priority]}
    </Badge>
  )
}
