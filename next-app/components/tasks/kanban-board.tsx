"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
import type { TaskListFilters, TaskWithPeople } from "@/lib/auth/task-context"
import type { BoardList, Label, Milestone, ProjectMemberWithProfile } from "@/lib/database.types"
import { AddBoardList } from "@/components/tasks/add-board-list"
import { BoardListColumn } from "@/components/tasks/board-list-column"
import { BoardListFocusSheet } from "@/components/tasks/board-list-focus-sheet"
import { BoardListSummaryTile } from "@/components/tasks/board-list-summary"
import { KanbanCardOverlay } from "@/components/tasks/kanban-card"
import { TaskFiltersBar } from "@/components/tasks/task-filters-bar"
import { BOARD_KEY_ORDER, BOARD_KEYS, type BoardKey } from "@/lib/constants/board-keys"
import {
  applyAllBoardPositions,
  findTaskListId,
  flattenBoardTasks,
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
  initialLists: BoardList[]
  tasks: TaskWithPeople[]
  members: ProjectMemberWithProfile[]
  projectLabels: Label[]
  milestones: Array<Pick<Milestone, "id" | "name">>
  canEdit: boolean
  filters: TaskListFilters
  onFiltersChange: (filters: TaskListFilters) => void
  onDragActiveChange?: (active: boolean) => void
  onTasksChange?: (tasks: TaskWithPeople[]) => void
  onTaskCreated?: (taskId: string) => void
  onBoardRefresh?: () => Promise<void>
  onOpenTask: (taskId: string) => void
  onPrefetchTask?: (taskId: string) => void
}

type ActiveDrag =
  | { type: "task"; taskId: string }
  | { type: "list"; listId: string }
  | null

export function KanbanBoard({
  slug,
  projectId,
  initialLists,
  tasks,
  members,
  projectLabels,
  milestones,
  canEdit,
  filters,
  onFiltersChange,
  onDragActiveChange,
  onTasksChange,
  onTaskCreated,
  onBoardRefresh,
  onOpenTask,
  onPrefetchTask,
}: KanbanBoardProps) {
  const skipTasksSyncRef = useRef(false)
  const [board, setBoard] = useState<KanbanBoardState>(() =>
    groupTasksForBoard(initialLists, tasks)
  )
  const [activeDrag, setActiveDrag] = useState<ActiveDrag>(null)
  const [createListId, setCreateListId] = useState<string | null>(null)
  const [activeBoardKey, setActiveBoardKey] = useState<BoardKey | "all">("all")
  const [focusListId, setFocusListId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  )

  useEffect(() => {
    if (skipTasksSyncRef.current) {
      skipTasksSyncRef.current = false
      return
    }
    setBoard((current) => ({
      lists: current.lists,
      tasksByList: groupTasksForBoard(current.lists, tasks).tasksByList,
    }))
  }, [tasks])

  const listSortableIds = useMemo(
    () => board.lists.map((list) => listSortableId(list.id)),
    [board.lists]
  )

  const visibleLists = useMemo(() => {
    if (activeBoardKey === "all") {
      return board.lists
    }
    return board.lists.filter((list) => list.board_key === activeBoardKey)
  }, [activeBoardKey, board.lists])

  const boardTabs = useMemo(() => {
    const keys = new Set(
      board.lists
        .map((list) => list.board_key)
        .filter((key): key is BoardKey => Boolean(key && key in BOARD_KEYS))
    )
    return BOARD_KEY_ORDER.filter((key) => keys.has(key))
  }, [board.lists])

  const isSystemsOverview = activeBoardKey === "systems"

  const focusList = useMemo(
    () => (focusListId ? board.lists.find((list) => list.id === focusListId) ?? null : null),
    [board.lists, focusListId]
  )

  const activeTask = useMemo(() => {
    if (activeDrag?.type !== "task") return null
    for (const list of board.lists) {
      const match = board.tasksByList[list.id]?.find((task) => task.id === activeDrag.taskId)
      if (match) return { task: match, list }
    }
    return null
  }, [activeDrag, board])

  function commitTasks(next: KanbanBoardState) {
    skipTasksSyncRef.current = true
    setBoard(next)
    onTasksChange?.(flattenBoardTasks(next))
  }

  function commitLists(nextLists: BoardList[]) {
    setBoard((current) => ({ ...current, lists: nextLists }))
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
    if (!canEdit) return

    const { active, over } = event
    if (!over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (activeDrag?.type === "list") {
      const activeListId = parseListSortableId(activeId)
      const overListId = parseListSortableId(overId)
      if (!activeListId || !overListId || activeListId === overListId) return

      setBoard((current) => {
        const reordered = reorderBoardListItems(current.lists, activeListId, overListId)
        if (reordered === current.lists) return current
        return { ...current, lists: reordered }
      })
      return
    }

    if (activeDrag?.type !== "task") return

    const fromListId = findTaskListId(board, activeId)
    const target = resolveTaskTarget(overId, board)
    if (!fromListId || !target) return

    if (fromListId === target.listId) {
      const fromIndex = board.tasksByList[fromListId].findIndex((task) => task.id === activeId)
      if (fromIndex === target.index || fromIndex === target.index - 1) return
    }

    setBoard((current) => moveTaskInBoard(current, activeId, target.listId, target.index))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    const currentDrag = activeDrag
    setActiveDrag(null)
    onDragActiveChange?.(false)

    if (!canEdit || !over) return

    const activeId = String(active.id)
    const overId = String(over.id)

    if (currentDrag?.type === "list") {
      setBoard((current) => {
        void reorderBoardLists(
          slug,
          current.lists.map((list) => list.id)
        )
        return current
      })
      return
    }

    const target = resolveTaskTarget(overId, board)
    if (!target) return

    const next = applyAllBoardPositions(
      moveTaskInBoard(board, activeId, target.listId, target.index)
    )
    commitTasks(next)

    const movedTask = next.tasksByList[target.listId]?.find((task) => task.id === activeId)
    if (!movedTask) return

    void moveTaskOnBoard(slug, activeId, target.listId, movedTask.board_position)
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
        clientMode
        filters={filters}
        onFiltersChange={onFiltersChange}
        onCreateOpenChange={(open) => {
          if (!open) setCreateListId(null)
        }}
        onTaskCreated={onTaskCreated}
      />

      {boardTabs.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveBoardKey("all")}
            className={`rounded-full border px-3 py-1 text-xs ${
              activeBoardKey === "all"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            All boards
          </button>
          {boardTabs.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveBoardKey(key)}
              className={`rounded-full border px-3 py-1 text-xs ${
                activeBoardKey === key
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground"
              }`}
            >
              {BOARD_KEYS[key]}
            </button>
          ))}
        </div>
      ) : null}

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
          {visibleLists.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/40 p-10 text-center">
              <h2 className="text-sm font-medium">
                {activeBoardKey === "all" ? "Your board is empty" : "No lists in this board yet"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {activeBoardKey === "all"
                  ? "Create your first list — for example Bugs, Roadmap, or Current work — then add cards inside it."
                  : "Import the Everwood plan or ask Souls to create lists for this board."}
              </p>
              {canEdit ? (
                <div className="mx-auto mt-6 max-w-sm">
                  <AddBoardList
                    slug={slug}
                    projectId={projectId}
                    canEdit={canEdit}
                    inline
                    onListCreated={(list) => {
                      commitLists([...board.lists, list])
                      setBoard((current) => ({
                        ...current,
                        tasksByList: { ...current.tasksByList, [list.id]: [] },
                      }))
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : isSystemsOverview ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {visibleLists.map((list) => (
                <BoardListSummaryTile
                  key={list.id}
                  list={list}
                  tasks={board.tasksByList[list.id] ?? []}
                  onOpenList={() => setFocusListId(list.id)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {visibleLists.map((list) => (
                <BoardListColumn
                  key={list.id}
                  list={list}
                  tasks={board.tasksByList[list.id] ?? []}
                  allLists={board.lists}
                  projectId={projectId}
                  slug={slug}
                  canEdit={canEdit}
                  onOpenTask={onOpenTask}
                  onPrefetchTask={onPrefetchTask}
                  onAddCard={(listId) => {
                    setCreateListId(listId)
                    const trigger = document.getElementById("board-create-task-trigger")
                    trigger?.click()
                  }}
                  onListDeleted={async (listId) => {
                    const nextLists = board.lists.filter((item) => item.id !== listId)
                    const nextTasksByList = { ...board.tasksByList }
                    delete nextTasksByList[listId]
                    setBoard({ lists: nextLists, tasksByList: nextTasksByList })
                    await onBoardRefresh?.()
                  }}
                  onListUpdated={(updatedList) => {
                    commitLists(
                      board.lists.map((item) => (item.id === updatedList.id ? updatedList : item))
                    )
                  }}
                  onOpenListFocus={setFocusListId}
                  onBoardRefresh={onBoardRefresh}
                />
              ))}
              <AddBoardList
                slug={slug}
                projectId={projectId}
                canEdit={canEdit}
                onListCreated={(list) => {
                  commitLists([...board.lists, list])
                  setBoard((current) => ({
                    ...current,
                    tasksByList: { ...current.tasksByList, [list.id]: [] },
                  }))
                }}
              />
            </div>
          )}
        </SortableContext>

        <DragOverlay>
          {activeTask ? (
            <KanbanCardOverlay task={activeTask.task} listColor={activeTask.list.color} />
          ) : null}
        </DragOverlay>
      </DndContext>

      <BoardListFocusSheet
        open={focusListId !== null}
        onOpenChange={(open) => {
          if (!open) setFocusListId(null)
        }}
        list={focusList}
        tasks={focusList ? board.tasksByList[focusList.id] ?? [] : []}
        allLists={board.lists}
        slug={slug}
        projectId={projectId}
        canEdit={canEdit}
        onOpenTask={onOpenTask}
        onBoardRefresh={onBoardRefresh}
      />
    </div>
  )
}
