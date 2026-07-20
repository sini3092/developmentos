"use client"

import { useRouter } from "next/navigation"
import { useActionState, useEffect, useTransition } from "react"
import { Tag } from "lucide-react"

import { createProjectLabel, toggleTaskLabel } from "@/lib/actions/tasks"
import type { Label } from "@/lib/database.types"
import { LABEL_COLOR_CLASSES, LABEL_COLORS } from "@/lib/constants/tasks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type TaskLabelsSectionProps = {
  taskId: string
  slug: string
  projectId: string
  projectLabels: Label[]
  taskLabels: Label[]
  canEdit: boolean
}

export function TaskLabelsSection({
  taskId,
  slug,
  projectId,
  projectLabels,
  taskLabels,
  canEdit,
}: TaskLabelsSectionProps) {
  const router = useRouter()
  const [createState, createAction, createPending] = useActionState(createProjectLabel, {})
  const [isToggling, startToggle] = useTransition()
  const taskLabelIds = new Set(taskLabels.map((label) => label.id))

  useEffect(() => {
    if (createState.success) {
      router.refresh()
    }
  }, [createState.success, router])

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Tag className="size-4" />
        Labels
      </h3>

      {taskLabels.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {taskLabels.map((label) => (
            <Badge
              key={label.id}
              variant="outline"
              className={cn(
                "font-normal",
                LABEL_COLOR_CLASSES[label.color as keyof typeof LABEL_COLOR_CLASSES] ??
                  LABEL_COLOR_CLASSES.slate
              )}
            >
              {label.name}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No labels on this task.</p>
      )}

      {canEdit ? (
        <div className="space-y-3 rounded-lg border border-border/60 bg-surface-raised/30 p-3">
          {projectLabels.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {projectLabels.map((label) => {
                const active = taskLabelIds.has(label.id)
                return (
                  <Button
                    key={label.id}
                    type="button"
                    size="sm"
                    variant={active ? "default" : "outline"}
                    disabled={isToggling}
                    className="h-7"
                    onClick={() => {
                      startToggle(async () => {
                        await toggleTaskLabel(taskId, label.id, slug, !active)
                        router.refresh()
                      })
                    }}
                  >
                    {label.name}
                  </Button>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Create a project label to start tagging tasks.
            </p>
          )}

          <form action={createAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="projectId" value={projectId} />
            <input type="hidden" name="slug" value={slug} />
            <Input
              name="name"
              placeholder="New label"
              className="h-8 max-w-40"
              required
            />
            <select
              name="color"
              defaultValue="slate"
              className="flex h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
            >
              {LABEL_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </select>
            <Button type="submit" size="sm" disabled={createPending}>
              {createPending ? "Adding..." : "Add label"}
            </Button>
          </form>
          {createState.error ? (
            <p className="text-sm text-danger">{createState.error}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
