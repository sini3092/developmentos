"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AlignLeft, CheckSquare, MessageSquare, Paperclip } from "lucide-react"

import type { TaskWithPeople } from "@/lib/auth/task-context"
import { getBoardListColorClasses } from "@/lib/constants/board-lists"
import { cn } from "@/lib/utils"

type KanbanCardProps = {
  task: TaskWithPeople
  listColor: string
  onOpen: (taskId: string) => void
  isDragging?: boolean
  canEdit: boolean
  isRemoteHighlight?: boolean
}

export function KanbanCard({
  task,
  listColor,
  onOpen,
  isDragging = false,
  canEdit,
  isRemoteHighlight = false,
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSorting } =
    useSortable({
      id: task.id,
      disabled: !canEdit,
      data: { type: "task" },
    })

  const colorClasses = getBoardListColorClasses(listColor)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "overflow-hidden rounded-lg border border-border/60 bg-card shadow-xs transition-shadow",
        (isDragging || isSorting) && "opacity-60 ring-2 ring-primary/30",
        isRemoteHighlight && "remote-update-pulse ring-2 ring-info/50",
        canEdit && "cursor-grab active:cursor-grabbing"
      )}
      {...attributes}
      {...listeners}
    >
      <div className={cn("h-1.5 w-full", colorClasses.bar)} />
      <button type="button" className="w-full p-3 text-left" onClick={() => onOpen(task.id)}>
        <p className="text-sm font-medium leading-snug">{task.title}</p>

        {task.checklist_preview.length > 0 ? (
          <ul className="mt-2.5 space-y-1">
            {task.checklist_preview.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "mt-0.5 size-3.5 shrink-0 rounded border",
                    item.completed
                      ? "border-success bg-success text-success-foreground"
                      : "border-border bg-background"
                  )}
                />
                <span className={cn("line-clamp-1", item.completed && "line-through opacity-70")}>
                  {item.title}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {task.description ? (
            <span className="inline-flex items-center gap-1">
              <AlignLeft className="size-3" />
            </span>
          ) : null}
          {task.checklist_total > 0 ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5",
                task.checklist_done === task.checklist_total
                  ? "bg-success/10 text-success"
                  : "bg-muted"
              )}
            >
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
      </button>
    </div>
  )
}

export function KanbanCardOverlay({
  task,
  listColor,
}: {
  task: TaskWithPeople
  listColor: string
}) {
  const colorClasses = getBoardListColorClasses(listColor)

  return (
    <div className="w-72 rotate-2 overflow-hidden rounded-lg border border-primary/30 bg-card shadow-lg">
      <div className={cn("h-1.5 w-full", colorClasses.bar)} />
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-medium">{task.title}</p>
      </div>
    </div>
  )
}
