import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { BoardList } from "@/lib/database.types"

export type KanbanBoardState = {
  lists: BoardList[]
  tasksByList: Record<string, TaskWithPeople[]>
}

export function groupTasksForBoard(
  lists: BoardList[],
  tasks: TaskWithPeople[]
): KanbanBoardState {
  const tasksByList: Record<string, TaskWithPeople[]> = Object.fromEntries(
    lists.map((list) => [list.id, [] as TaskWithPeople[]])
  )

  const fallbackListId = lists[0]?.id ?? null

  for (const task of tasks) {
    if (task.status === "cancelled") {
      continue
    }

    const listId =
      task.list_id && tasksByList[task.list_id] ? task.list_id : fallbackListId
    if (!listId) {
      continue
    }

    tasksByList[listId].push(task)
  }

  for (const list of lists) {
    tasksByList[list.id].sort((a, b) => {
      if (a.board_position !== b.board_position) {
        return a.board_position - b.board_position
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  return { lists, tasksByList }
}

export function findTaskListId(state: KanbanBoardState, taskId: string) {
  for (const list of state.lists) {
    if (state.tasksByList[list.id]?.some((task) => task.id === taskId)) {
      return list.id
    }
  }

  return null
}

export function moveTaskInBoard(
  state: KanbanBoardState,
  taskId: string,
  toListId: string,
  toIndex: number
): KanbanBoardState {
  const fromListId = findTaskListId(state, taskId)
  if (!fromListId || !state.tasksByList[toListId]) {
    return state
  }

  const tasksByList = Object.fromEntries(
    state.lists.map((list) => [list.id, [...(state.tasksByList[list.id] ?? [])]])
  ) as Record<string, TaskWithPeople[]>

  const fromIndex = tasksByList[fromListId].findIndex((task) => task.id === taskId)
  if (fromIndex === -1) {
    return state
  }

  const [task] = tasksByList[fromListId].splice(fromIndex, 1)
  const updatedTask = { ...task, list_id: toListId }
  const clampedIndex = Math.max(0, Math.min(toIndex, tasksByList[toListId].length))
  tasksByList[toListId].splice(clampedIndex, 0, updatedTask)

  return { ...state, tasksByList }
}

export function applyListBoardPositions(
  state: KanbanBoardState,
  listId: string
): KanbanBoardState {
  const tasksByList = { ...state.tasksByList }
  tasksByList[listId] = (tasksByList[listId] ?? []).map((task, index) => ({
    ...task,
    board_position: (index + 1) * 1000,
  }))

  return { ...state, tasksByList }
}

export function applyAllBoardPositions(state: KanbanBoardState): KanbanBoardState {
  let next = state
  for (const list of state.lists) {
    next = applyListBoardPositions(next, list.id)
  }
  return next
}

export function reorderBoardListItems(
  lists: BoardList[],
  activeListId: string,
  overListId: string
): BoardList[] {
  const fromIndex = lists.findIndex((list) => list.id === activeListId)
  const toIndex = lists.findIndex((list) => list.id === overListId)

  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
    return lists
  }

  const next = [...lists]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)

  return next.map((list, index) => ({
    ...list,
    position: (index + 1) * 1000,
  }))
}

export function listSortableId(listId: string) {
  return `list-${listId}`
}

export function parseListSortableId(id: string) {
  return id.startsWith("list-") ? id.slice(5) : null
}

export function flattenBoardTasks(state: KanbanBoardState): TaskWithPeople[] {
  const result: TaskWithPeople[] = []

  for (const list of state.lists) {
    result.push(...(state.tasksByList[list.id] ?? []))
  }

  return result
}
