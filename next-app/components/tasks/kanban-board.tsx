"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { LayoutGroup } from "motion/react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { moveTaskOnBoard } from "@/lib/actions/tasks"
import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { Label, Milestone, ProjectMemberWithProfile } from "@/lib/database.types"
import type { TaskStatus } from "@/lib/database.types"
import { KANBAN_COLUMNS } from "@/lib/constants/tasks"
import { KanbanCardOverlay } from "@/components/tasks/kanban-card"
import { KanbanColumn } from "@/components/tasks/kanban-column"
import { TaskFiltersBar } from "@/components/tasks/task-filters-bar"
import {
  applyBoardPositions,
  findTaskColumn,
  groupTasksForKanban,
  moveTaskInColumns,
  type KanbanColumns,
} from "@/lib/utils/kanban"

type KanbanBoardProps = {
  slug: string
  projectId: string
  tasks: TaskWithPeople[]
  members: ProjectMemberWithProfile[]
  projectLabels: Label[]
  milestones: Array<Pick<Milestone, "id" | "name">>
  canEdit: boolean
  highlightedTaskIds?: Set<string>
  onDragActiveChange?: (active: boolean) => void
}

export function KanbanBoard({
  slug,
  projectId,
  tasks,
  members,
  projectLabels,
  milestones,
  canEdit,
  highlightedTaskIds,
  onDragActiveChange,
}: KanbanBoardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [columns, setColumns] = useState<KanbanColumns>(() =>
    groupTasksForKanban(tasks)
  )
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  useEffect(() => {
    setColumns(groupTasksForKanban(tasks))
  }, [tasks])

  const activeTask = useMemo(() => {
    if (!activeTaskId) {
      return null
    }

    for (const status of KANBAN_COLUMNS) {
      const match = columns[status].find((task) => task.id === activeTaskId)
      if (match) {
        return match
      }
    }

    return null
  }, [activeTaskId, columns])

  function openTask(taskId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("task", taskId)
    router.push(`/projects/${slug}/tasks/board?${params.toString()}`)
  }

  function resolveTarget(
    overId: string,
    snapshot: KanbanColumns
  ): { column: TaskStatus; index: number } | null {
    if (KANBAN_COLUMNS.includes(overId as TaskStatus)) {
      const column = overId as TaskStatus
      return { column, index: snapshot[column].length }
    }

    const column = findTaskColumn(snapshot, overId)
    if (!column) {
      return null
    }

    const index = snapshot[column].findIndex((task) => task.id === overId)
    return { column, index: index === -1 ? snapshot[column].length : index }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(String(event.active.id))
    onDragActiveChange?.(true)
  }

  function handleDragOver(event: DragOverEvent) {
    if (!canEdit) {
      return
    }

    const { active, over } = event
    if (!over) {
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)
    const fromColumn = findTaskColumn(columns, activeId)
    const target = resolveTarget(overId, columns)

    if (!fromColumn || !target) {
      return
    }

    if (fromColumn === target.column) {
      const fromIndex = columns[fromColumn].findIndex((task) => task.id === activeId)
      if (fromIndex === target.index || fromIndex === target.index - 1) {
        return
      }
    }

    setColumns((current) => moveTaskInColumns(current, activeId, target.column, target.index))
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveTaskId(null)
    onDragActiveChange?.(false)

    if (!canEdit || !over) {
      return
    }

    const activeId = String(active.id)
    const overId = String(over.id)
    const target = resolveTarget(overId, columns)

    if (!target) {
      return
    }

    const next = applyBoardPositions(
      moveTaskInColumns(columns, activeId, target.column, target.index)
    )
    setColumns(next)

    const movedTask = next[target.column].find((task) => task.id === activeId)
    if (!movedTask) {
      return
    }

    const result = await moveTaskOnBoard(
      slug,
      activeId,
      movedTask.status,
      movedTask.board_position
    )

    if (result?.error) {
      setColumns(groupTasksForKanban(tasks))
      return
    }

    router.refresh()
  }

  return (
    <div className="flex flex-1 flex-col gap-4 p-6">
      <TaskFiltersBar
        slug={slug}
        projectId={projectId}
        members={members}
        projectLabels={projectLabels}
        milestones={milestones}
        canEdit={canEdit}
        basePath="/tasks/board"
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveTaskId(null)
          onDragActiveChange?.(false)
        }}
      >
        <LayoutGroup id={`kanban-${projectId}`}>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {KANBAN_COLUMNS.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                tasks={columns[status]}
                onOpenTask={openTask}
                canEdit={canEdit}
                highlightedTaskIds={highlightedTaskIds}
              />
            ))}
          </div>
        </LayoutGroup>

        <DragOverlay>
          {activeTask ? <KanbanCardOverlay task={activeTask} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
