"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect } from "react"
import { GitBranch } from "lucide-react"

import { addTaskDependency, removeTaskDependency } from "@/lib/actions/task-dependencies"
import type { TaskDetail } from "@/lib/auth/task-context"
import type { ProjectTaskLinkOptions } from "@/lib/auth/task-link-options"
import type { TaskStatus } from "@/lib/database.types"
import { TaskStatusBadge } from "@/components/tasks/task-badges"
import { Button } from "@/components/ui/button"

type TaskDependenciesSectionProps = {
  task: Pick<TaskDetail, "id" | "blocked_by" | "blocks">
  slug: string
  linkOptions: ProjectTaskLinkOptions
  canEdit: boolean
  onOpenTask?: (taskId: string) => void
}

export function TaskDependenciesSection({
  task,
  slug,
  linkOptions,
  canEdit,
  onOpenTask,
}: TaskDependenciesSectionProps) {
  const router = useRouter()
  const [addState, addAction, adding] = useActionState(addTaskDependency, {})
  const [, removeAction] = useActionState(removeTaskDependency, {})

  useEffect(() => {
    if (addState.success) {
      router.refresh()
    }
  }, [addState.success, router])

  const blockedByIds = new Set(task.blocked_by.map((dependency) => dependency.id))
  const blocksIds = new Set(task.blocks.map((dependency) => dependency.id))
  const unavailableIds = new Set([task.id, ...blockedByIds, ...blocksIds])

  const availableBlockers = linkOptions.tasks.filter((option) => !unavailableIds.has(option.id))
  const hasDependencies = task.blocked_by.length > 0 || task.blocks.length > 0

  if (!canEdit && !hasDependencies) {
    return null
  }

  return (
    <div className="space-y-4 border-t border-border/60 pt-4">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <GitBranch className="size-4" />
        Dependencies
      </h3>

      {task.blocked_by.length > 0 ? (
        <DependencyGroup title="Blocked by">
          {task.blocked_by.map((dependency) => (
            <DependencyItem
              key={dependency.id}
              identifier={dependency.identifier}
              title={dependency.title}
              status={dependency.status}
              canEdit={canEdit}
              onOpen={() => onOpenTask?.(dependency.id)}
              onRemove={
                canEdit ? (
                  <form action={removeAction}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="linkId" value={dependency.link_id} />
                    <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      Remove
                    </Button>
                  </form>
                ) : null
              }
            />
          ))}
        </DependencyGroup>
      ) : null}

      {task.blocks.length > 0 ? (
        <DependencyGroup title="Blocks">
          {task.blocks.map((dependency) => (
            <DependencyItem
              key={dependency.id}
              identifier={dependency.identifier}
              title={dependency.title}
              status={dependency.status}
              canEdit={canEdit}
              onOpen={() => onOpenTask?.(dependency.id)}
              onRemove={
                canEdit ? (
                  <form action={removeAction}>
                    <input type="hidden" name="slug" value={slug} />
                    <input type="hidden" name="linkId" value={dependency.link_id} />
                    <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs">
                      Remove
                    </Button>
                  </form>
                ) : null
              }
            />
          ))}
        </DependencyGroup>
      ) : null}

      {canEdit ? (
        <form action={addAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="taskId" value={task.id} />
          <label className="space-y-1 text-xs">
            <span className="font-medium text-muted-foreground">Blocked by</span>
            <select
              name="dependsOnTaskId"
              defaultValue=""
              required
              className="h-8 min-w-[12rem] rounded-lg border border-input bg-background px-2 text-sm"
            >
              <option value="" disabled>
                Select blocker…
              </option>
              {availableBlockers.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <Button type="submit" size="sm" disabled={adding || availableBlockers.length === 0}>
            {adding ? "Adding…" : "Add dependency"}
          </Button>
        </form>
      ) : null}

      {addState.error ? <p className="text-xs text-danger">{addState.error}</p> : null}

      {!hasDependencies && !canEdit ? (
        <p className="text-sm text-muted-foreground">No dependencies linked.</p>
      ) : null}
    </div>
  )
}

function DependencyGroup({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function DependencyItem({
  identifier,
  title,
  status,
  canEdit,
  onOpen,
  onRemove,
}: {
  identifier: string
  title: string
  status: TaskStatus
  canEdit: boolean
  onOpen?: () => void
  onRemove?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/60 bg-surface-raised/40 px-3 py-2">
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
        disabled={!onOpen}
      >
        <p className="text-sm font-medium">
          <span className="text-muted-foreground">{identifier}</span> {title}
        </p>
        <div className="mt-1">
          <TaskStatusBadge status={status} />
        </div>
      </button>
      {canEdit ? onRemove : null}
    </div>
  )
}
