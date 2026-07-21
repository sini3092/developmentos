"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"

import { reorderBoardLists } from "@/lib/actions/board-lists"
import { moveTaskOnBoard } from "@/lib/actions/tasks"
import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { BoardList, Label, Milestone, ProjectMemberWithProfile } from "@/lib/database.types"
import { AddBoardList } from "@/components/tasks/add-board-list"
import { BoardListColumn } from "@/components/tasks/board-list-column"
import { KanbanCardOverlay } from "@/components/tasks/kanban-card"
import { TaskFiltersBar } from "@/components/tasks/task-filters-bar"
import {
  applyAllBoardPositions,
  findTaskListId,
  groupTasksForBoard,
  listSortableId,
  moveTaskInBoard,
  parseListSortableId,
  reorderBoardListItems,
  type KanbanBoardState,
} from "@/lib/utils/kanban"

type KanbanBoardProps = {
  slug: string
  projectId: string
  lists: BoardList[]
  tasks: TaskWithPeople[]
  members: ProjectMemberWithProfile[]
  projectLabels: Label[]
  milestones: Array<Pick<Milestone, "id" | "name">>
  canEdit: boolean
  highlightedTaskIds?: Set<string>
  onDragActiveChange?: (active: boolean) => void
}

type ActiveDrag =
  | { type: "task"; taskId: string }
  | { type: "list"; listId: string }
  | null

export function KanbanBoard({
  slug,
  projectId,
  lists,
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
  const [board, setBoard] = useState<KanbanBoardState>(() => groupTasksForBoard(lists, tasks))
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null)
  const [createListId, setCreateListId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  useEffect(() => {
    setBoard(groupTasksForBoard(lists, tasks))
  }, [lists, tasks])

  const listSortableIds = useMemo(
    () => board.lists.map((list) => listSortableId(list.id)),
    [board.lists]
  )

  const activeTask = useMemo(() => {
    if (activeDrag?.type !== "task") return null
    for (const list of board.lists) {
      const match = board.tasksByList[list.id]?.find((task) => task.id === activeDrag.taskId)
      if (match) return { task: match, list }
    }
    return null
  }, [activeDrag, board])

  function openTask(taskId: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set("task", taskId)
    router.push(`/projects/${slug}/tasks/board?${params.toString()}`)
  }

  function resolveTaskTarget(
    overId: string,
    snapshot: KanbanBoardState
  ): { listId: string; index: number } | null {
    const listFromSortable = parseListSortableId(overId)
    if (listFromSortable && snapshot.tasksByList[listFromSortable]) {
      return { listId: listFromSortable, index: snapshot.tasksByList[listFromSortable].length }
    }

    if (snapshot.tasksByList[overId]) {
      return { listId: overId, index: snapshot.tasksByList[overId].length }
    }

    const listId = findTaskListId(snapshot, overId)
    if (!listId) return null

    const index = snapshot.tasksByList[listId].findIndex((task) => task.id === overId)
    return { listId, index: index === -1 ? snapshot.tasksByList[listId].length : index }
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id)
    const type = event.active.data.current?.type

    if (type === "list") {
      const listId = parseListSortableId(id)
      if (listId) setActiveDrag({ type: "list", listId })
    } else {
      setActiveDrag({ type: "task", taskId: id })
    }

    onDragActiveChange?.(true)
  }

  function handleDragOver(event: DragOverEvent) {
    if (!canEdit || activeDrag?.type !== "task") return

    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)
    const fromListId = findTaskListId(board, activeId)
    const target = resolveTaskTarget(overId, board)

    if (!fromListId || !target) return

    if (fromListId === target.listId) {
      const fromIndex = board.tasksByList[fromListId].findIndex((task) => task.id === activeId)
      if (fromIndex === target.index || fromIndex === target.index - 1) return
    }

    setBoard((current) => moveTaskInBoard(current, activeId, target.listId, target.index))
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const currentDrag = activeDrag
    setActiveDrag(null)
    onDragActiveChange?.(false)

    if (!canEdit || !over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (currentDrag?.type === "list") {
      const activeListId = parseListSortableId(activeId)
      const overListId = parseListSortableId(overId) ?? overId
      if (!activeListId) return

      const reordered = reorderBoardListItems(board.lists, activeListId, overListId)
      setBoard((current) => ({ ...current, lists: reordered }))
      await reorderBoardLists(
        slug,
        reordered.map((list) => list.id)
      )
      router.refresh()
      return
    }

    const target = resolveTaskTarget(overId, board)
    if (!target) return

    const next = applyAllBoardPositions(
      moveTaskInBoard(board, activeId, target.listId, target.index)
    )
    setBoard(next)

    const movedTask = next.tasksByList[target.listId]?.find((task) => task.id === activeId)
    if (!movedTask) return

    const result = await moveTaskOnBoard(
      slug,
      activeId,
      target.listId,
      movedTask.board_position
    )

    if (result?.error) {
      setBoard(groupTasksForBoard(lists, tasks))
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
        lists={board.lists}
        canEdit={canEdit}
        basePath="/tasks/board"
        defaultListId={createListId}
        onCreateOpenChange={(open) => {
          if (!open) setCreateListId(null)
        }}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={() => {
          setActiveDrag(null)
          onDragActiveChange?.(false)
        }}
      >
        <SortableContext items={listSortableIds} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {board.lists.map((list) => (
              <BoardListColumn
                key={list.id}
                list={list}
                tasks={board.tasksByList[list.id] ?? []}
                slug={slug}
                canEdit={canEdit}
                onOpenTask={openTask}
                onAddCard={(listId) => {
                  setCreateListId(listId)
                  const trigger = document.getElementById("board-create-task-trigger")
                  trigger?.click()
                }}
                highlightedTaskIds={highlightedTaskIds}
              />
            ))}
            <AddBoardList slug={slug} projectId={projectId} canEdit={canEdit} />
          </div>
        </SortableContext>

        <DragOverlay>
          {activeTask ? (
            <KanbanCardOverlay task={activeTask.task} listColor={activeTask.list.color} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
