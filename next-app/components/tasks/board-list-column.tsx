"use client"

import { useState, useTransition } from "react"
import { GripVertical, MoreHorizontal, Pencil } from "lucide-react"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AnimatePresence, motion } from "motion/react"

import { renameBoardList } from "@/lib/actions/board-lists"
import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { BoardList } from "@/lib/database.types"
import { getBoardListColorClasses } from "@/lib/constants/board-lists"
import { KanbanCard } from "@/components/tasks/kanban-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { listSortableId } from "@/lib/utils/kanban"

type BoardListColumnProps = {
  list: BoardList
  tasks: TaskWithPeople[]
  slug: string
  canEdit: boolean
  onOpenTask: (taskId: string) => void
  onAddCard: (listId: string) => void
  highlightedTaskIds?: Set<string>
}

export function BoardListColumn({
  list,
  tasks,
  slug,
  canEdit,
  onOpenTask,
  onAddCard,
  highlightedTaskIds,
}: BoardListColumnProps) {
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: list.id,
    data: { type: "list-drop" },
  })

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: listSortableId(list.id),
    disabled: !canEdit,
    data: { type: "list" },
  })

  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(list.name)
  const [pending, startTransition] = useTransition()

  const colorClasses = getBoardListColorClasses(list.color)

  function saveName() {
    const trimmed = name.trim()
    if (!trimmed || trimmed === list.name) {
      setEditing(false)
      setName(list.name)
      return
    }

    startTransition(async () => {
      await renameBoardList(slug, list.id, trimmed)
      setEditing(false)
    })
  }

  return (
    <div
      ref={setSortableRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "flex min-h-[28rem] flex-col rounded-xl border border-border/60 bg-surface-raised/50",
        "border-t-[3px]",
        colorClasses.border,
        isOver && "ring-2 ring-primary/20",
        isDragging && "opacity-70"
      )}
    >
      <div className="flex items-start gap-1 border-b border-border/50 px-2 py-2">
        {canEdit ? (
          <button
            type="button"
            className="mt-0.5 rounded p-1 text-muted-foreground hover:bg-muted"
            aria-label="Drag list"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          {editing ? (
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={saveName}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveName()
                if (event.key === "Escape") {
                  setName(list.name)
                  setEditing(false)
                }
              }}
              className="h-8 text-sm font-semibold"
              autoFocus
              disabled={pending}
            />
          ) : (
            <div className="flex items-center justify-between gap-2 px-1">
              <h3 className="truncate text-sm font-semibold">{list.name}</h3>
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                {tasks.length}
              </span>
            </div>
          )}
        </div>
        {canEdit && !editing ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="shrink-0">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditing(true)}>
                <Pencil className="size-3.5" />
                Rename list
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <div
        ref={setDropRef}
        className="flex max-h-[calc(100vh-18rem)] min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 py-2"
      >
        <SortableContext items={tasks.map((task) => task.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence initial={false}>
            {tasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.8 }}
              >
                <KanbanCard
                  task={task}
                  listColor={list.color}
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
            Drop cards here
          </div>
        ) : null}
      </div>

      {canEdit ? (
        <div className="border-t border-border/50 p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
            onClick={() => onAddCard(list.id)}
          >
            + Add a card
          </Button>
        </div>
      ) : null}
    </div>
  )
}
