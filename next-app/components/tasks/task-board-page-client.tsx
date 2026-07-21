"use client"

import { KanbanBoard } from "@/components/tasks/kanban-board"
import { TaskBoardLive } from "@/components/tasks/task-board-live"
import type { TaskDetail, TaskListFilters, TaskWithPeople } from "@/lib/auth/task-context"
import type {
  BoardList,
  Initiative,
  Label,
  Milestone,
  ProjectMemberWithProfile,
} from "@/lib/database.types"

type TaskBoardPageClientProps = {
  slug: string
  projectId: string
  lists: BoardList[]
  initialTasks: TaskWithPeople[]
  filters: TaskListFilters
  members: ProjectMemberWithProfile[]
  initiatives: Pick<Initiative, "id" | "name" | "slug">[]
  milestones: Array<Pick<Milestone, "id" | "name" | "slug" | "initiative_id">>
  initialSelectedTask: TaskDetail | null
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
  filters,
  members,
  initiatives,
  milestones,
  initialSelectedTask,
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
      filters={filters}
      members={members}
      initiatives={initiatives}
      milestones={milestones}
      initialSelectedTask={initialSelectedTask}
      repoOwner={repoOwner}
      repoName={repoName}
      canEdit={canEdit}
    >
      {({ tasks, highlightedTaskIds, onDragActiveChange }) => (
        <KanbanBoard
          slug={slug}
          projectId={projectId}
          lists={lists}
          tasks={tasks}
          members={members}
          projectLabels={projectLabels}
          milestones={milestones.map((item) => ({ id: item.id, name: item.name }))}
          canEdit={canEdit}
          highlightedTaskIds={highlightedTaskIds}
          onDragActiveChange={onDragActiveChange}
        />
      )}
    </TaskBoardLive>
  )
}
