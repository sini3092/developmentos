"use client"

import { Plus } from "lucide-react"
import { useEffect, useState, useTransition } from "react"

import type { TaskListFilters } from "@/lib/auth/task-context"
import type { BoardList, Label, Milestone, ProjectMemberWithProfile } from "@/lib/database.types"
import type { TaskPriority } from "@/lib/database.types"
import {
  DISCIPLINE_LABELS,
  DISCIPLINES,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
} from "@/lib/constants/tasks"
import { CreateTaskForm } from "@/components/tasks/create-task-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

type TaskFiltersBarProps = {
  slug: string
  projectId: string
  members: ProjectMemberWithProfile[]
  projectLabels: Label[]
  milestones: Array<Pick<Milestone, "id" | "name">>
  lists?: BoardList[]
  canEdit: boolean
  basePath: string
  defaultListId?: string | null
  onCreateOpenChange?: (open: boolean) => void
  onTaskCreated?: (taskId: string) => void
  clientMode?: boolean
  filters?: TaskListFilters
  onFiltersChange?: (filters: TaskListFilters) => void
}

export function TaskFiltersBar({
  slug,
  projectId,
  members,
  projectLabels,
  milestones,
  lists = [],
  canEdit,
  basePath,
  defaultListId,
  onCreateOpenChange,
  onTaskCreated,
  clientMode = false,
  filters,
  onFiltersChange,
}: TaskFiltersBarProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [searchInput, setSearchInput] = useState(filters?.search ?? "")
  const [, startTransition] = useTransition()

  const listFilter = filters?.listId ?? "all"
  const assigneeFilter = filters?.assigneeId ?? "all"
  const priorityFilter = (filters?.priority as TaskPriority | "all") ?? "all"
  const disciplineFilter = filters?.discipline ?? "all"
  const labelFilter = filters?.labelId ?? "all"
  const milestoneFilter = filters?.milestoneId ?? "all"

  useEffect(() => {
    if (defaultListId) {
      setCreateOpen(true)
    }
  }, [defaultListId])

  useEffect(() => {
    setSearchInput(filters?.search ?? "")
  }, [filters?.search])

  useEffect(() => {
    if (!clientMode || !onFiltersChange || !filters) return

    const timer = window.setTimeout(() => {
      if ((filters.search ?? "") === searchInput) return
      onFiltersChange({ ...filters, search: searchInput || undefined })
    }, 250)

    return () => window.clearTimeout(timer)
  }, [clientMode, filters, onFiltersChange, searchInput])

  function handleCreateOpenChange(open: boolean) {
    setCreateOpen(open)
    onCreateOpenChange?.(open)
  }

  function updateFilter(key: keyof TaskListFilters, value: string) {
    if (!clientMode || !onFiltersChange || !filters) return

    const next = { ...filters }

    switch (key) {
      case "listId":
        next.listId = value || "all"
        break
      case "assigneeId":
        next.assigneeId = value || "all"
        break
      case "priority":
        next.priority = (value || "all") as TaskListFilters["priority"]
        break
      case "discipline":
        next.discipline = (value || "all") as TaskListFilters["discipline"]
        break
      case "labelId":
        next.labelId = value || "all"
        break
      case "milestoneId":
        next.milestoneId = value || "all"
        break
      case "search":
        next.search = value || undefined
        break
    }

    startTransition(() => {
      onFiltersChange(next)
    })
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex flex-wrap gap-2">
        <FilterButton active={listFilter === "all"} onClick={() => updateFilter("listId", "all")}>
          All lists
        </FilterButton>
        {lists.map((list) => (
          <FilterButton
            key={list.id}
            active={listFilter === list.id}
            onClick={() => updateFilter("listId", list.id)}
          >
            {list.name}
          </FilterButton>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search tasks..."
          value={searchInput}
          onChange={(event) => {
            const value = event.target.value
            setSearchInput(value)
            if (!clientMode) {
              updateFilter("search", value)
            }
          }}
          className="h-8 w-44"
        />
        <select
          value={assigneeFilter}
          onChange={(event) => updateFilter("assigneeId", event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="all">All assignees</option>
          <option value="unassigned">Unassigned</option>
          {members.map((member) => (
            <option key={member.user_id} value={member.user_id}>
              {member.profile?.display_name ?? member.user_id}
            </option>
          ))}
        </select>
        <select
          value={priorityFilter}
          onChange={(event) => updateFilter("priority", event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="all">All priorities</option>
          {TASK_PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {TASK_PRIORITY_LABELS[priority]}
            </option>
          ))}
        </select>
        <select
          value={disciplineFilter}
          onChange={(event) => updateFilter("discipline", event.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
        >
          <option value="all">All disciplines</option>
          {DISCIPLINES.map((discipline) => (
            <option key={discipline} value={discipline}>
              {DISCIPLINE_LABELS[discipline]}
            </option>
          ))}
        </select>
        {projectLabels.length > 0 ? (
          <select
            value={labelFilter}
            onChange={(event) => updateFilter("labelId", event.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="all">All labels</option>
            {projectLabels.map((label) => (
              <option key={label.id} value={label.id}>
                {label.name}
              </option>
            ))}
          </select>
        ) : null}
        {milestones.length > 0 ? (
          <select
            value={milestoneFilter}
            onChange={(event) => updateFilter("milestoneId", event.target.value)}
            className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
          >
            <option value="all">All milestones</option>
            {milestones.map((milestone) => (
              <option key={milestone.id} value={milestone.id}>
                {milestone.name}
              </option>
            ))}
          </select>
        ) : null}
        {canEdit && lists.length > 0 ? (
          <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
            <DialogTrigger asChild>
              <Button id="board-create-task-trigger" size="sm">
                <Plus className="size-3.5" />
                New task
              </Button>
            </DialogTrigger>
            <DialogContent className="!duration-0 data-open:animate-none data-closed:animate-none max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create card</DialogTitle>
              </DialogHeader>
              <CreateTaskForm
                projectId={projectId}
                slug={slug}
                lists={lists}
                defaultListId={defaultListId ?? lists[0]?.id}
                onSuccess={(taskId) => {
                  handleCreateOpenChange(false)
                  onTaskCreated?.(taskId)
                }}
              />
            </DialogContent>
          </Dialog>
        ) : null}
        {canEdit && lists.length === 0 ? (
          <span className="text-xs text-muted-foreground">Create a list before adding cards</span>
        ) : null}
      </div>
    </div>
  )
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-xs ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}
