"use client"

import { ChevronRight } from "lucide-react"

import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { BoardList } from "@/lib/database.types"
import { getBoardListColorClasses } from "@/lib/constants/board-lists"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const DENSE_LIST_CARD_LIMIT = 5
export const DENSE_LIST_THRESHOLD = 8

type BoardListSummaryTileProps = {
  list: BoardList
  tasks: TaskWithPeople[]
  onOpenList: () => void
}

export function BoardListSummaryTile({ list, tasks, onOpenList }: BoardListSummaryTileProps) {
  const colorClasses = getBoardListColorClasses(list.color)
  const doneCount = tasks.filter((task) => task.status === "done").length
  const preview = tasks.slice(0, 3)

  return (
    <button
      type="button"
      onClick={onOpenList}
      className={cn(
        "flex min-h-40 flex-col rounded-xl border border-border/60 bg-card p-4 text-left shadow-xs transition-colors",
        "border-t-[3px] hover:bg-muted/20",
        colorClasses.border
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold">{list.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {tasks.length} cards · {doneCount} done
          </p>
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </div>

      {preview.length > 0 ? (
        <ul className="mt-4 space-y-1.5 text-xs text-muted-foreground">
          {preview.map((task) => (
            <li key={task.id} className="flex items-center gap-2">
              <span
                className={cn(
                  "size-1.5 shrink-0 rounded-full",
                  task.status === "done" ? "bg-success" : "bg-muted-foreground/50"
                )}
              />
              <span className="truncate">{task.title}</span>
            </li>
          ))}
          {tasks.length > preview.length ? (
            <li className="pt-1 text-[11px] text-muted-foreground/80">
              +{tasks.length - preview.length} more
            </li>
          ) : null}
        </ul>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">No cards yet</p>
      )}
    </button>
  )
}

type DenseListPreviewProps = {
  tasks: TaskWithPeople[]
  onOpenList: () => void
  onOpenTask: (taskId: string) => void
}

export function DenseListPreview({ tasks, onOpenList, onOpenTask }: DenseListPreviewProps) {
  const previewTasks = tasks.slice(0, DENSE_LIST_CARD_LIMIT)

  return (
    <div className="space-y-2">
      {previewTasks.map((task) => (
        <button
          key={task.id}
          type="button"
          onClick={() => onOpenTask(task.id)}
          className="flex w-full items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2 text-left text-sm hover:bg-muted/30"
        >
          <span
            className={cn(
              "size-1.5 shrink-0 rounded-full",
              task.status === "done" ? "bg-success" : "bg-muted-foreground/50"
            )}
          />
          <span className="truncate font-medium">{task.title}</span>
        </button>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={onOpenList}>
        View all {tasks.length} cards
      </Button>
    </div>
  )
}
