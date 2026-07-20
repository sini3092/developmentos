"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect, useTransition } from "react"
import { CheckSquare, Trash2 } from "lucide-react"

import {
  addChecklistItem,
  deleteChecklistItem,
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
}

export function TaskChecklistSection({
  taskId,
  slug,
  items,
  canEdit,
}: TaskChecklistSectionProps) {
  const router = useRouter()
  const [addState, addAction, addPending] = useActionState(addChecklistItem, {})
  const [isUpdating, startUpdate] = useTransition()

  useEffect(() => {
    if (addState.success) {
      router.refresh()
    }
  }, [addState.success, router])

  const completedCount = items.filter((item) => item.completed).length
  const progress =
    items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100)

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <CheckSquare className="size-4" />
          Checklist
          {items.length > 0 ? (
            <span className="text-xs font-normal text-muted-foreground">
              {completedCount}/{items.length}
            </span>
          ) : null}
        </h3>
        {items.length > 0 ? (
          <span className="text-xs font-medium text-muted-foreground">{progress}%</span>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-2 rounded-lg border border-border/60 bg-surface-raised/30 px-3 py-2"
            >
              <input
                type="checkbox"
                checked={item.completed}
                disabled={!canEdit || isUpdating}
                onChange={() => {
                  startUpdate(async () => {
                    await toggleChecklistItem(item.id, slug, !item.completed)
                    router.refresh()
                  })
                }}
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
                  onClick={() => {
                    startUpdate(async () => {
                      await deleteChecklistItem(item.id, slug)
                      router.refresh()
                    })
                  }}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
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
