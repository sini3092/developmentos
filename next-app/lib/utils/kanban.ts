import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { TaskStatus } from "@/lib/database.types"
import { KANBAN_COLUMNS } from "@/lib/constants/tasks"

export type KanbanColumns = Record<TaskStatus, TaskWithPeople[]>

export function groupTasksForKanban(tasks: TaskWithPeople[]): KanbanColumns {
  const columns = KANBAN_COLUMNS.reduce((acc, status) => {
    acc[status] = []
    return acc
  }, {} as KanbanColumns)

  for (const task of tasks) {
    if (task.status === "cancelled") {
      continue
    }

    if (columns[task.status]) {
      columns[task.status].push(task)
    }
  }

  for (const status of KANBAN_COLUMNS) {
    columns[status].sort((a, b) => {
      if (a.board_position !== b.board_position) {
        return a.board_position - b.board_position
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }

  return columns
}

export function findTaskColumn(
  columns: KanbanColumns,
  taskId: string
): TaskStatus | null {
  for (const status of KANBAN_COLUMNS) {
    if (columns[status].some((task) => task.id === taskId)) {
      return status
    }
  }

  return null
}

export function moveTaskInColumns(
  columns: KanbanColumns,
  taskId: string,
  toStatus: TaskStatus,
  toIndex: number
): KanbanColumns {
  const next: KanbanColumns = KANBAN_COLUMNS.reduce((acc, status) => {
    acc[status] = [...columns[status]]
    return acc
  }, {} as KanbanColumns)

  const fromStatus = findTaskColumn(next, taskId)
  if (!fromStatus) {
    return columns
  }

  const fromIndex = next[fromStatus].findIndex((task) => task.id === taskId)
  if (fromIndex === -1) {
    return columns
  }

  const [task] = next[fromStatus].splice(fromIndex, 1)
  const updatedTask = { ...task, status: toStatus }
  const clampedIndex = Math.max(0, Math.min(toIndex, next[toStatus].length))
  next[toStatus].splice(clampedIndex, 0, updatedTask)

  return next
}

export function applyBoardPositions(columns: KanbanColumns): KanbanColumns {
  const next = { ...columns }

  for (const status of KANBAN_COLUMNS) {
    next[status] = next[status].map((task, index) => ({
      ...task,
      board_position: (index + 1) * 1000,
    }))
  }

  return next
}
