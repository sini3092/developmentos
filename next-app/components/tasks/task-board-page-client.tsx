"use client"

import { KanbanBoard } from "@/components/tasks/kanban-board"
import { TaskBoardLive } from "@/components/tasks/task-board-live"
import type { TaskListFilters, TaskWithPeople } from "@/lib/auth/task-context"
import type { BoardList, Label, Milestone, ProjectMemberWithProfile } from "@/lib/database.types"

type TaskBoardPageClientProps = {
  slug: string
  projectId: string
  lists: BoardList[]
  initialTasks: TaskWithPeople[]
  initialFilters: TaskListFilters
  members: ProjectMemberWithProfile[]
  milestones: Array<Pick<Milestone, "id" | "name">>
  repoOwner?: string | null
  repoName?: string | null
  canEdit: boolean
  projectLabels: Label[]
}

export function TaskBoardPageClient({
  slug,
  projectId,
  lists,
  initialTasks,
  initialFilters,
  members,
  milestones,
  repoOwner,
  repoName,
  canEdit,
  projectLabels,
}: TaskBoardPageClientProps) {
  return (
    <TaskBoardLive
      slug={slug}
      projectId={projectId}
      initialTasks={initialTasks}
      initialFilters={initialFilters}
      members={members}
      repoOwner={repoOwner}
      repoName={repoName}
      canEdit={canEdit}
    >
      {({
        tasks,
        filters,
        onFiltersChange,
        onDragActiveChange,
        onTasksChange,
        onTaskCreated,
        onBoardRefresh,
        onOpenTask,
        onPrefetchTask,
      }) => (
        <KanbanBoard
          slug={slug}
          projectId={projectId}
          initialLists={lists}
          tasks={tasks}
          members={members}
          projectLabels={projectLabels}
          milestones={milestones}
          canEdit={canEdit}
          filters={filters}
          onFiltersChange={onFiltersChange}
          onDragActiveChange={onDragActiveChange}
          onTasksChange={onTasksChange}
          onTaskCreated={onTaskCreated}
          onBoardRefresh={onBoardRefresh}
          onOpenTask={onOpenTask}
          onPrefetchTask={onPrefetchTask}
        />
      )}
    </TaskBoardLive>
  )
}
