"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Plus } from "lucide-react"
import { useState } from "react"

import type { Label, Milestone, ProjectMemberWithProfile } from "@/lib/database.types"
import type { TaskPriority, TaskStatus } from "@/lib/database.types"
import {
  DISCIPLINE_LABELS,
  DISCIPLINES,
  OPEN_TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
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
  canEdit: boolean
  basePath: string
}

export function TaskFiltersBar({
  slug,
  projectId,
  members,
  projectLabels,
  milestones,
  canEdit,
  basePath,
}: TaskFiltersBarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [createOpen, setCreateOpen] = useState(false)

  const statusFilter = (searchParams.get("status") as TaskStatus | "all") || "all"
  const assigneeFilter = searchParams.get("assignee") || "all"
  const priorityFilter = (searchParams.get("priority") as TaskPriority | "all") || "all"
  const disciplineFilter = searchParams.get("discipline") || "all"
  const labelFilter = searchParams.get("label") || "all"
  const milestoneFilter = searchParams.get("milestone") || "all"
  const search = searchParams.get("q") || ""

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (!value || value === "all") {
      params.delete(key)
    } else {
      params.set(key, value)
    }
    const query = params.toString()
    router.push(query ? `/projects/${slug}${basePath}?${query}` : `/projects/${slug}${basePath}`)
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex flex-wrap gap-2">
        <FilterButton active={statusFilter === "all"} onClick={() => updateFilter("status", "all")}>
          All
        </FilterButton>
        {OPEN_TASK_STATUSES.map((status) => (
          <FilterButton
            key={status}
            active={statusFilter === status}
            onClick={() => updateFilter("status", status)}
          >
            {TASK_STATUS_LABELS[status]}
          </FilterButton>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(event) => updateFilter("q", event.target.value)}
          className="h-8 w-44"
        />
        <select
          value={assigneeFilter}
          onChange={(event) => updateFilter("assignee", event.target.value)}
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
            onChange={(event) => updateFilter("label", event.target.value)}
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
            onChange={(event) => updateFilter("milestone", event.target.value)}
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
        {canEdit ? (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-3.5" />
                New task
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create task</DialogTitle>
              </DialogHeader>
              <CreateTaskForm
                projectId={projectId}
                slug={slug}
                members={members}
                onSuccess={() => {
                  setCreateOpen(false)
                  router.refresh()
                }}
              />
            </DialogContent>
          </Dialog>
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
      className={`rounded-lg px-2.5 py-1 text-xs transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  )
}
