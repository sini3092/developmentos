"use client"

import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { AnimatePresence, motion } from "motion/react"

import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { TaskStatus } from "@/lib/database.types"
import {
  KANBAN_COLUMN_ACCENTS,
  TASK_STATUS_LABELS,
} from "@/lib/constants/tasks"
import { KanbanCard } from "@/components/tasks/kanban-card"
import { cn } from "@/lib/utils"

type KanbanColumnProps = {
  status: TaskStatus
  tasks: TaskWithPeople[]
  onOpenTask: (taskId: string) => void
  canEdit: boolean
  highlightedTaskIds?: Set<string>
}

export function KanbanColumn({
  status,
  tasks,
  onOpenTask,
  canEdit,
  highlightedTaskIds,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border border-border/60 bg-surface-raised/40",
        "border-t-2",
        KANBAN_COLUMN_ACCENTS[status],
        isOver && "ring-2 ring-primary/20"
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <h3 className="text-xs font-medium tracking-wide uppercase">
          {TASK_STATUS_LABELS[status]}
        </h3>
        <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className="flex min-h-32 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3"
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                layoutId={`kanban-task-${task.id}`}
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
              >
                <KanbanCard
                  task={task}
                  onOpen={onOpenTask}
                  canEdit={canEdit}
                  isRemoteHighlight={highlightedTaskIds?.has(task.id) ?? false}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </SortableContext>

        {tasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground">
            Drop tasks here
          </div>
        ) : null}
      </div>
    </div>
  )
}
