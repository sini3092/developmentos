"use client"

import { useRouter, useSearchParams } from "next/navigation"

import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { Label, Milestone, ProjectMemberWithProfile } from "@/lib/database.types"
import { TaskFiltersBar } from "@/components/tasks/task-filters-bar"
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/tasks/task-badges"
import { TasksViewToggle } from "@/components/tasks/tasks-view-toggle"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { getInitials } from "@/lib/utils/format"

type TasksViewProps = {
  slug: string
  projectId: string
  tasks: TaskWithPeople[]
  members: ProjectMemberWithProfile[]
  projectLabels: Label[]
  milestones: Array<Pick<Milestone, "id" | "name">>
  canEdit: boolean
}

export function TasksView({
  slug,
  projectId,
  tasks,
  members,
  projectLabels,
  milestones,
  canEdit,
}: TasksViewProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function openTask(taskId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("task", taskId)
    router.push(`/projects/${slug}/tasks?${params.toString()}`)
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
        basePath="/tasks"
      />

      {tasks.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 border-b border-border/60 px-4 py-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            <span>ID</span>
            <span>Title</span>
            <span className="hidden sm:block">Assignee</span>
            <span className="hidden md:block">Status</span>
            <span className="hidden lg:block">Priority</span>
          </div>
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => openTask(task.id)}
              className="grid w-full grid-cols-[auto_1fr_auto_auto_auto] gap-3 border-b border-border/40 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-surface-raised/60"
            >
              <span className="font-mono text-xs text-muted-foreground">
                {task.identifier}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{task.title}</span>
                <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {task.due_date ? (
                    <span>Due {new Date(task.due_date).toLocaleDateString()}</span>
                  ) : null}
                  {task.labels.slice(0, 2).map((label) => (
                    <span key={label.id} className="rounded-full border border-border/60 px-1.5 py-0.5">
                      {label.name}
                    </span>
                  ))}
                  {task.checklist_total > 0 ? (
                    <span>
                      Checklist {task.checklist_done}/{task.checklist_total}
                    </span>
                  ) : null}
                </span>
              </span>
              <span className="hidden sm:flex items-center gap-2">
                {task.assignee ? (
                  <>
                    <Avatar className="size-6 rounded-md">
                      <AvatarFallback className="rounded-md text-[10px]">
                        {getInitials(task.assignee.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-24 truncate text-xs">
                      {task.assignee.display_name}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </span>
              <span className="hidden md:block">
                <TaskStatusBadge status={task.status} />
              </span>
              <span className="hidden lg:block">
                <TaskPriorityBadge priority={task.priority} />
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-8 text-center">
          <h2 className="text-sm font-medium">No tasks found</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {canEdit
              ? "Create a task to start tracking work for this project."
              : "No tasks match the current filters."}
          </p>
        </div>
      )}
    </div>
  )
}
