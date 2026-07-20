"use client"

import { useActionState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Archive } from "lucide-react"

import { bulkArchiveTasks, bulkUpdateTasks } from "@/lib/actions/tasks"
import type { ProjectMemberWithProfile } from "@/lib/database.types"
import {
  DISCIPLINES,
  DISCIPLINE_LABELS,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/lib/constants/tasks"
import { Button } from "@/components/ui/button"

type TaskBulkEditBarProps = {
  slug: string
  selectedTaskIds: string[]
  members: ProjectMemberWithProfile[]
  onClear: () => void
}

export function TaskBulkEditBar({
  slug,
  selectedTaskIds,
  members,
  onClear,
}: TaskBulkEditBarProps) {
  const router = useRouter()
  const [updateState, updateAction, updatePending] = useActionState(bulkUpdateTasks, {})
  const [archiveState, archiveAction, archivePending] = useActionState(bulkArchiveTasks, {})

  useEffect(() => {
    if (updateState.success || archiveState.success) {
      onClear()
      router.refresh()
    }
  }, [updateState.success, archiveState.success, onClear, router])

  if (selectedTaskIds.length === 0) {
    return null
  }

  const taskIdsValue = selectedTaskIds.join(",")
  const error = updateState.error ?? archiveState.error
  const success = updateState.success ?? archiveState.success

  return (
    <div className="rounded-xl border border-info/30 bg-info/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {selectedTaskIds.length} task{selectedTaskIds.length === 1 ? "" : "s"} selected
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={onClear}>
          Clear selection
        </Button>
      </div>

      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
      {success ? <p className="mt-2 text-sm text-success">{success}</p> : null}

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <form action={updateAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="taskIds" value={taskIdsValue} />

          <BulkSelect
            name="status"
            label="Status"
            options={TASK_STATUSES.map((status) => ({
              value: status,
              label: TASK_STATUS_LABELS[status],
            }))}
          />
          <BulkSelect
            name="priority"
            label="Priority"
            options={TASK_PRIORITIES.map((priority) => ({
              value: priority,
              label: TASK_PRIORITY_LABELS[priority],
            }))}
          />
          <BulkSelect
            name="assigneeId"
            label="Assignee"
            options={[
              { value: "__unassigned__", label: "Unassigned" },
              ...members.map((member) => ({
                value: member.user_id,
                label: member.profile?.display_name ?? member.user_id,
              })),
            ]}
          />
          <BulkSelect
            name="discipline"
            label="Discipline"
            options={[
              { value: "__clear__", label: "Clear discipline" },
              ...DISCIPLINES.map((discipline) => ({
                value: discipline,
                label: DISCIPLINE_LABELS[discipline],
              })),
            ]}
          />

          <Button type="submit" size="sm" disabled={updatePending}>
            {updatePending ? "Applying…" : "Apply changes"}
          </Button>
        </form>

        <form action={archiveAction}>
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="taskIds" value={taskIdsValue} />
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className="text-danger"
            disabled={archivePending}
          >
            <Archive className="size-4" />
            {archivePending ? "Archiving…" : "Archive"}
          </Button>
        </form>
      </div>
    </div>
  )
}

function BulkSelect({
  name,
  label,
  options,
}: {
  name: string
  label: string
  options: Array<{ value: string; label: string }>
}) {
  return (
    <label className="space-y-1 text-xs">
      <span className="font-medium text-muted-foreground">{label}</span>
      <select
        name={name}
        defaultValue="__unchanged__"
        className="h-8 min-w-[9rem] rounded-lg border border-input bg-background px-2 text-sm"
      >
        <option value="__unchanged__">No change</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}
