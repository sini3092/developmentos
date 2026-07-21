"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { CheckSquare, GripVertical, Trash2 } from "lucide-react"

import {
  addChecklistItem,
  deleteChecklistItem,
  reorderChecklistItems,
  toggleChecklistItem,
} from "@/lib/actions/tasks"
import type { ProjectMemberWithProfile, TaskChecklistItem } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type ChecklistItemWithCompleter = TaskChecklistItem & {
  completer?: { display_name: string | null } | null
}

type TaskChecklistSectionProps = {
  taskId: string
  slug: string
  items: ChecklistItemWithCompleter[]
  members: ProjectMemberWithProfile[]
  canEdit: boolean
  onChanged?: () => void
}

function SortableChecklistRow({
  item,
  canEdit,
  isUpdating,
  onToggle,
  onDelete,
}: {
  item: ChecklistItemWithCompleter
  canEdit: boolean
  isUpdating: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !canEdit,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border/60 bg-surface-raised/30 px-3 py-2",
        isDragging && "opacity-60 ring-2 ring-primary/30"
      )}
    >
      {canEdit ? (
        <button
          type="button"
          className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted"
          aria-label="Drag checklist item"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
      ) : null}
      <input
        type="checkbox"
        checked={item.completed}
        disabled={!canEdit || isUpdating}
        onChange={onToggle}
        className="mt-0.5 size-4 rounded border-input"
      />
      <div className="min-w-0 flex-1">
        <span
          className={cn(
            "block text-sm",
            item.completed && "text-muted-foreground line-through"
          )}
        >
          {item.title}
        </span>
        {item.completed && item.completer?.display_name ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Checked by {item.completer.display_name}
            {item.completed_at
              ? ` · ${new Date(item.completed_at).toLocaleString()}`
              : null}
          </span>
        ) : null}
      </div>
      {canEdit ? (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-7 text-muted-foreground hover:text-danger"
          disabled={isUpdating}
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : null}
    </li>
  )
}

export function TaskChecklistSection({
  taskId,
  slug,
  items,
  canEdit,
  onChanged,
}: TaskChecklistSectionProps) {
  const [addState, addAction, addPending] = useActionState(addChecklistItem, {})
  const [isUpdating, startUpdate] = useTransition()
  const [orderedItems, setOrderedItems] = useState(items)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  useEffect(() => {
    setOrderedItems(items)
  }, [items])

  useEffect(() => {
    if (addState.success) {
      onChanged?.()
    }
  }, [addState.success, onChanged])

  const completedCount = orderedItems.filter((item) => item.completed).length
  const progress =
    orderedItems.length === 0 ? 0 : Math.round((completedCount / orderedItems.length) * 100)

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = orderedItems.findIndex((item) => item.id === active.id)
    const newIndex = orderedItems.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const nextItems = arrayMove(orderedItems, oldIndex, newIndex)
    setOrderedItems(nextItems)

    startUpdate(async () => {
      await reorderChecklistItems(
        slug,
        taskId,
        nextItems.map((item) => item.id)
      )
      onChanged?.()
    })
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <CheckSquare className="size-4" />
          Checklist
          {orderedItems.length > 0 ? (
            <span className="text-xs font-normal text-muted-foreground">
              {completedCount}/{orderedItems.length}
            </span>
          ) : null}
        </h3>
        {orderedItems.length > 0 ? (
          <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
        ) : null}
      </div>

      {orderedItems.length > 0 ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {orderedItems.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={orderedItems.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {orderedItems.map((item) => (
                <SortableChecklistRow
                  key={item.id}
                  item={item}
                  canEdit={canEdit}
                  isUpdating={isUpdating}
                  onToggle={() => {
                    startUpdate(async () => {
                      await toggleChecklistItem(item.id, slug, !item.completed)
                      onChanged?.()
                    })
                  }}
                  onDelete={() => {
                    startUpdate(async () => {
                      await deleteChecklistItem(item.id, slug)
                      onChanged?.()
                    })
                  }}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="text-sm text-muted-foreground">
          Add checklist items to track work and auto-update progress.
        </p>
      )}

      {canEdit ? (
        <form action={addAction} className="flex gap-2">
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="slug" value={slug} />
          <Input name="title" placeholder="Add checklist item..." required />
          <Button type="submit" size="sm" disabled={addPending}>
            {addPending ? "Adding..." : "Add"}
          </Button>
        </form>
      ) : null}
      {addState.error ? <p className="text-sm text-danger">{addState.error}</p> : null}
    </section>
  )
}
