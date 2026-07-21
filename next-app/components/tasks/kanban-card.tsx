"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CheckSquare, MessageSquare, Paperclip } from "lucide-react"

import type { TaskWithPeople } from "@/lib/auth/task-context"
import { TaskPriorityBadge } from "@/components/tasks/task-badges"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { getInitials } from "@/lib/utils/format"

type KanbanCardProps = {
  task: TaskWithPeople
  onOpen: (taskId: string) => void
  isDragging?: boolean
  canEdit: boolean
  isRemoteHighlight?: boolean
}

export function KanbanCard({
  task,
  onOpen,
  isDragging = false,
  canEdit,
  isRemoteHighlight = false,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } =
    useSortable({
      id: task.id,
      disabled: !canEdit,
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-lg border border-border/60 bg-card p-3 shadow-xs transition-shadow",
        (isDragging || isSorting) && "opacity-60 ring-2 ring-primary/30",
        isRemoteHighlight && "remote-update-pulse ring-2 ring-info/50",
        canEdit && "cursor-grab active:cursor-grabbing"
      )}
      {...attributes}
      {...listeners}
    >
      <button
        type="button"
        className="w-full text-left"
        onClick={() => onOpen(task.id)}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="font-mono text-[10px] text-muted-foreground">
            {task.identifier}
          </span>
          <TaskPriorityBadge priority={task.priority} />
        </div>
        <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug">
          {task.title}
        </p>
        {task.labels.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.labels.slice(0, 2).map((label) => (
              <span
                key={label.id}
                className="rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {label.name}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {task.assignee ? (
              <Avatar className="size-6 rounded-md">
                <AvatarFallback className="rounded-md text-[9px]">
                  {getInitials(task.assignee.display_name)}
                </AvatarFallback>
              </Avatar>
            ) : (
              <span className="text-[10px] text-muted-foreground">Unassigned</span>
            )}
            {task.due_date ? (
              <span className="text-[10px] text-muted-foreground">
                {new Date(task.due_date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {task.checklist_total > 0 ? (
              <span className="inline-flex items-center gap-1">
                <CheckSquare className="size-3" />
                {task.checklist_done}/{task.checklist_total}
              </span>
            ) : null}
            {task.attachment_count > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Paperclip className="size-3" />
                {task.attachment_count}
              </span>
            ) : null}
            {task.comment_count > 0 ? (
              <span className="inline-flex items-center gap-1">
                <MessageSquare className="size-3" />
                {task.comment_count}
              </span>
            ) : null}
          </div>
        </div>
      </button>
    </div>
  )
}

export function KanbanCardOverlay({ task }: { task: TaskWithPeople }) {
  return (
    <div className="rotate-2 rounded-lg border border-primary/30 bg-card p-3 shadow-lg">
      <span className="font-mono text-[10px] text-muted-foreground">
        {task.identifier}
      </span>
      <p className="mt-1 line-clamp-2 text-sm font-medium">{task.title}</p>
    </div>
  )
}
