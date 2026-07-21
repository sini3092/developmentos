"use client"

import { useState, useTransition } from "react"
import { GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useDroppable } from "@dnd-kit/core"
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { AnimatePresence, motion } from "motion/react"

import { deleteBoardList, renameBoardList } from "@/lib/actions/board-lists"
import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { BoardList } from "@/lib/database.types"
import { getBoardListColorClasses } from "@/lib/constants/board-lists"
import { KanbanCard } from "@/components/tasks/kanban-card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { listSortableId } from "@/lib/utils/kanban"

type BoardListColumnProps = {
  list: BoardList
  tasks: TaskWithPeople[]
  allLists: BoardList[]
  projectId: string
  slug: string
  canEdit: boolean
  onOpenTask: (taskId: string) => void
  onAddCard: (listId: string) => void
  highlightedTaskIds?: Set<string>
}

export function BoardListColumn({
  list,
  tasks,
  allLists,
  projectId,
  slug,
  canEdit,
  onOpenTask,
  onAddCard,
  highlightedTaskIds,
}: BoardListColumnProps) {
  const router = useRouter()
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
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [moveToListId, setMoveToListId] = useState("")
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const colorClasses = getBoardListColorClasses(list.color)
  const otherLists = allLists.filter((item) => item.id !== list.id)
  const hasCards = tasks.length > 0

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

  function handleDelete() {
    setDeleteError(null)
    startTransition(async () => {
      const result = await deleteBoardList(
        slug,
        projectId,
        list.id,
        otherLists.length > 0 && hasCards ? moveToListId || null : null
      )

      if (result.error) {
        setDeleteError(result.error)
        return
      }

      setDeleteOpen(false)
      router.refresh()
    })
  }

  return (
    <>
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
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => {
                    setMoveToListId(otherLists[0]?.id ?? "")
                    setDeleteError(null)
                    setDeleteOpen(true)
                  }}
                >
                  <Trash2 className="size-3.5" />
                  Delete list
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        <div
          ref={setDropRef}
          className="flex max-h-[calc(100vh-18rem)] min-h-24 flex-1 flex-col gap-2 overflow-y-auto px-2 py-2"
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete “{list.name}”?</DialogTitle>
            <DialogDescription>
              {hasCards
                ? otherLists.length > 0
                  ? `This list has ${tasks.length} card${tasks.length === 1 ? "" : "s"}. Move them to another list or delete them with the list.`
                  : `This list has ${tasks.length} card${tasks.length === 1 ? "" : "s"}. Deleting the list will also remove those cards.`
                : "This list is empty and will be removed."}
            </DialogDescription>
          </DialogHeader>

          {hasCards && otherLists.length > 0 ? (
            <div className="space-y-2">
              <Label htmlFor={`move-${list.id}`}>Move cards to</Label>
              <select
                id={`move-${list.id}`}
                value={moveToListId}
                onChange={(event) => setMoveToListId(event.target.value)}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                {otherLists.map((other) => (
                  <option key={other.id} value={other.id}>
                    {other.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {deleteError ? (
            <p className="text-sm text-danger">{deleteError}</p>
          ) : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={pending}>
              {hasCards && otherLists.length === 0 ? "Delete list and cards" : "Delete list"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
