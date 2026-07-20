"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { Label, ProjectMemberWithProfile } from "@/lib/database.types"
import type { Milestone } from "@/lib/database.types"
import {
  DISCIPLINE_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants/tasks"
import { TaskBulkEditBar } from "@/components/tasks/task-bulk-edit-bar"
import { TaskFiltersBar } from "@/components/tasks/task-filters-bar"
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/tasks/task-badges"
import { TasksViewToggle } from "@/components/tasks/tasks-view-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils/format"

type TasksTableViewProps = {
  slug: string
  projectId: string
  tasks: TaskWithPeople[]
  members: ProjectMemberWithProfile[]
  projectLabels: Label[]
  milestones: Array<Pick<Milestone, "id" | "name">>
  canEdit: boolean
}

type SortKey =
  | "identifier"
  | "title"
  | "status"
  | "priority"
  | "assignee"
  | "due_date"
  | "progress"

type SortState = {
  key: SortKey
  direction: "asc" | "desc"
}

const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3, none: 4 }
const statusOrder = {
  backlog: 0,
  ready: 1,
  in_progress: 2,
  in_review: 3,
  blocked: 4,
  done: 5,
  cancelled: 6,
}

export function TasksTableView({
  slug,
  projectId,
  tasks,
  members,
  projectLabels,
  milestones,
  canEdit,
}: TasksTableViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sort, setSort] = useState<SortState>({ key: "identifier", direction: "asc" })
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])

  function openTask(taskId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("task", taskId)
    router.push(`/projects/${slug}/tasks/table?${params.toString()}`)
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" }
    )
  }

  const sortedTasks = useMemo(() => {
    const copy = [...tasks]
    copy.sort((a, b) => {
      let result = 0
      switch (sort.key) {
        case "identifier":
          result = a.identifier.localeCompare(b.identifier)
          break
        case "title":
          result = a.title.localeCompare(b.title)
          break
        case "status":
          result = statusOrder[a.status] - statusOrder[b.status]
          break
        case "priority":
          result = priorityOrder[a.priority] - priorityOrder[b.priority]
          break
        case "assignee":
          result = (a.assignee?.display_name ?? "").localeCompare(
            b.assignee?.display_name ?? ""
          )
          break
        case "due_date":
          result =
            new Date(a.due_date ?? "9999-12-31").getTime() -
            new Date(b.due_date ?? "9999-12-31").getTime()
          break
        case "progress":
          result = a.progress - b.progress
          break
      }
      return sort.direction === "asc" ? result : -result
    })
    return copy
  }, [tasks, sort])

  const visibleTaskIds = sortedTasks.map((task) => task.id)
  const allVisibleSelected =
    visibleTaskIds.length > 0 &&
    visibleTaskIds.every((taskId) => selectedTaskIds.includes(taskId))

  function toggleTaskSelection(taskId: string) {
    setSelectedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId]
    )
  }

  function toggleSelectAllVisible() {
    setSelectedTaskIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleTaskIds.includes(id))
      }

      return [...new Set([...current, ...visibleTaskIds])]
    })
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <TasksViewToggle slug={slug} />
      <TaskFiltersBar
        slug={slug}
        projectId={projectId}
        members={members}
        projectLabels={projectLabels}
        milestones={milestones}
        canEdit={canEdit}
        basePath="/tasks/table"
      />

      {canEdit ? (
        <TaskBulkEditBar
          slug={slug}
          selectedTaskIds={selectedTaskIds}
          members={members}
          onClear={() => setSelectedTaskIds([])}
        />
      ) : null}

      {sortedTasks.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
          <table className="min-w-full text-sm">
            <thead className="border-b border-border/60 bg-surface-raised/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                {canEdit ? (
                  <th className="w-10 px-4 py-2">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleSelectAllVisible}
                      aria-label="Select all visible tasks"
                      className="size-4 rounded border-border"
                    />
                  </th>
                ) : null}
                <SortHeader label="ID" active={sort.key === "identifier"} direction={sort.direction} onClick={() => toggleSort("identifier")} />
                <SortHeader label="Title" active={sort.key === "title"} direction={sort.direction} onClick={() => toggleSort("title")} />
                <SortHeader label="Status" active={sort.key === "status"} direction={sort.direction} onClick={() => toggleSort("status")} />
                <SortHeader label="Priority" active={sort.key === "priority"} direction={sort.direction} onClick={() => toggleSort("priority")} />
                <SortHeader label="Assignee" active={sort.key === "assignee"} direction={sort.direction} onClick={() => toggleSort("assignee")} />
                <th className="px-4 py-2 font-medium">Discipline</th>
                <SortHeader label="Due" active={sort.key === "due_date"} direction={sort.direction} onClick={() => toggleSort("due_date")} />
                <SortHeader label="Progress" active={sort.key === "progress"} direction={sort.direction} onClick={() => toggleSort("progress")} />
                <th className="px-4 py-2 font-medium">Labels</th>
              </tr>
            </thead>
            <tbody>
              {sortedTasks.map((task) => (
                <tr
                  key={task.id}
                  className="cursor-pointer border-b border-border/40 transition-colors last:border-b-0 hover:bg-surface-raised/50"
                  onClick={() => openTask(task.id)}
                >
                  {canEdit ? (
                    <td className="px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.includes(task.id)}
                        onChange={() => toggleTaskSelection(task.id)}
                        aria-label={`Select ${task.identifier}`}
                        className="size-4 rounded border-border"
                      />
                    </td>
                  ) : null}
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {task.identifier}
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <span className="block truncate font-medium">{task.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <TaskStatusBadge status={task.status} />
                  </td>
                  <td className="px-4 py-3">
                    <TaskPriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-4 py-3">
                    {task.assignee ? (
                      <span className="inline-flex items-center gap-2">
                        <Avatar className="size-6 rounded-md">
                          <AvatarFallback className="rounded-md text-[10px]">
                            {getInitials(task.assignee.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="truncate">{task.assignee.display_name}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {task.discipline ? DISCIPLINE_LABELS[task.discipline] : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {task.due_date
                      ? new Date(task.due_date).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{task.progress}%</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {task.labels.slice(0, 3).map((label) => (
                        <span
                          key={label.id}
                          className="rounded-full border border-border/60 px-2 py-0.5 text-[10px]"
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-8 text-center">
          <h2 className="text-sm font-medium">No tasks found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Adjust filters or create a task to get started.
          </p>
        </div>
      )}
    </div>
  )
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
}: {
  label: string
  active: boolean
  direction: "asc" | "desc"
  onClick: () => void
}) {
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <th className="px-4 py-2 font-medium">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {label}
        <Icon className="size-3" />
      </button>
    </th>
  )
}
