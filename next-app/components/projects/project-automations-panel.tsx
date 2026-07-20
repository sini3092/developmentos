"use client"

import { useActionState, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Workflow, X } from "lucide-react"

import {
  createProjectAutomation,
  deleteProjectAutomation,
  toggleProjectAutomation,
} from "@/lib/actions/automations"
import type { Label, ProjectAutomation } from "@/lib/database.types"
import {
  AUTOMATION_ACTION_LABELS,
  AUTOMATION_ACTION_TYPES,
  AUTOMATION_TRIGGER_LABELS,
  AUTOMATION_TRIGGER_TYPES,
  describeAutomationRule,
} from "@/lib/constants/automations"
import {
  DISCIPLINES,
  DISCIPLINE_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/lib/constants/tasks"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label as FormLabel } from "@/components/ui/label"

type ProjectAutomationsPanelProps = {
  slug: string
  projectId: string
  automations: ProjectAutomation[]
  labels: Label[]
}

export function ProjectAutomationsPanel({
  slug,
  projectId,
  automations,
  labels,
}: ProjectAutomationsPanelProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [createState, createAction, creating] = useActionState(createProjectAutomation, {})
  const [, toggleAction] = useActionState(toggleProjectAutomation, {})
  const [, deleteAction] = useActionState(deleteProjectAutomation, {})
  const [triggerType, setTriggerType] = useState<string>("task_status_changed")
  const [actionType, setActionType] = useState<string>("notify_assignee")

  useEffect(() => {
    if (createState.success) {
      setCreateOpen(false)
      router.refresh()
    }
  }, [createState.success, router])

  const sortedAutomations = useMemo(
    () => [...automations].sort((a, b) => Number(b.enabled) - Number(a.enabled)),
    [automations]
  )

  return (
    <section className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <Workflow className="size-4" />
            Automations
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Run actions automatically when tasks are created, assigned, or change status.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreateOpen((open) => !open)}>
          {createOpen ? "Close" : "New rule"}
        </Button>
      </div>

      {createOpen ? (
        <form action={createAction} className="space-y-4 rounded-lg border border-border/60 bg-surface-raised/40 p-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="projectId" value={projectId} />
          {createState.error ? (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {createState.error}
            </p>
          ) : null}
          <div className="space-y-2">
            <FormLabel htmlFor="automation-name">Rule name</FormLabel>
            <Input
              id="automation-name"
              name="name"
              placeholder="Notify on blocked tasks"
              required
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">Trigger</span>
              <select
                name="triggerType"
                value={triggerType}
                onChange={(event) => setTriggerType(event.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                {AUTOMATION_TRIGGER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {AUTOMATION_TRIGGER_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            {triggerType === "task_status_changed" ? (
              <label className="space-y-1 text-xs">
                <span className="font-medium text-muted-foreground">To status</span>
                <select
                  name="triggerStatus"
                  defaultValue="blocked"
                  className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                >
                  {TASK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {TASK_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">Only if priority</span>
              <select
                name="conditionPriority"
                defaultValue=""
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="">Any</option>
                {TASK_PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {TASK_PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">Only if discipline</span>
              <select
                name="conditionDiscipline"
                defaultValue=""
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                <option value="">Any</option>
                {DISCIPLINES.map((discipline) => (
                  <option key={discipline} value={discipline}>
                    {DISCIPLINE_LABELS[discipline]}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-end gap-2 text-xs">
              <input type="checkbox" name="conditionUnassigned" className="size-4 rounded border-input" />
              <span className="pb-1 font-medium text-muted-foreground">Only when unassigned</span>
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1 text-xs">
              <span className="font-medium text-muted-foreground">Action</span>
              <select
                name="actionType"
                value={actionType}
                onChange={(event) => setActionType(event.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
              >
                {AUTOMATION_ACTION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {AUTOMATION_ACTION_LABELS[type]}
                  </option>
                ))}
              </select>
            </label>
            {actionType === "set_task_status" ? (
              <label className="space-y-1 text-xs">
                <span className="font-medium text-muted-foreground">Set status to</span>
                <select
                  name="actionStatus"
                  defaultValue="in_review"
                  className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                >
                  {TASK_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {TASK_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            {actionType === "add_label" ? (
              <label className="space-y-1 text-xs">
                <span className="font-medium text-muted-foreground">Label</span>
                <select
                  name="actionLabelId"
                  defaultValue={labels[0]?.id ?? ""}
                  className="h-8 w-full rounded-lg border border-input bg-background px-2 text-sm"
                  required
                >
                  {labels.length === 0 ? (
                    <option value="">Create labels on tasks first</option>
                  ) : (
                    labels.map((label) => (
                      <option key={label.id} value={label.id}>
                        {label.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
            ) : null}
          </div>
          {actionType === "notify_assignee" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <FormLabel htmlFor="actionTitle">Notification title (optional)</FormLabel>
                <Input id="actionTitle" name="actionTitle" placeholder="Blocked task needs attention" />
              </div>
              <div className="space-y-2">
                <FormLabel htmlFor="actionBody">Notification body (optional)</FormLabel>
                <Input id="actionBody" name="actionBody" placeholder="Please add a blocker note." />
              </div>
            </div>
          ) : null}
          <Button type="submit" disabled={creating || (actionType === "add_label" && labels.length === 0)}>
            {creating ? "Creating…" : "Create automation"}
          </Button>
        </form>
      ) : null}

      {sortedAutomations.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No automations yet. Example: when a task becomes blocked, notify the assignee.
        </p>
      ) : (
        <div className="space-y-3">
          {sortedAutomations.map((automation) => (
            <div
              key={automation.id}
              className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/60 bg-surface-raised/40 p-4"
            >
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{automation.name}</p>
                  <Badge variant={automation.enabled ? "secondary" : "outline"}>
                    {automation.enabled ? "Active" : "Paused"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {describeAutomationRule({
                    trigger_type: automation.trigger_type,
                    trigger_config: automation.trigger_config as Record<string, unknown>,
                    condition_priority: automation.condition_priority,
                    condition_discipline: automation.condition_discipline,
                    condition_unassigned: automation.condition_unassigned,
                    action_type: automation.action_type,
                    action_config: automation.action_config as Record<string, unknown>,
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <form action={toggleAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="automationId" value={automation.id} />
                  <input
                    type="hidden"
                    name="enabled"
                    value={automation.enabled ? "false" : "true"}
                  />
                  <Button type="submit" variant="outline" size="sm">
                    {automation.enabled ? "Pause" : "Enable"}
                  </Button>
                </form>
                <form action={deleteAction}>
                  <input type="hidden" name="slug" value={slug} />
                  <input type="hidden" name="automationId" value={automation.id} />
                  <Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete automation">
                    <X className="size-4" />
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
