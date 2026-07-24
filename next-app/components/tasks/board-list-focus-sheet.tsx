"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Circle, Search } from "lucide-react"

import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { BoardList } from "@/lib/database.types"
import { getBoardListColorClasses } from "@/lib/constants/board-lists"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type BoardListFocusSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  list: BoardList | null
  tasks: TaskWithPeople[]
  onOpenTask: (taskId: string) => void
}

export function BoardListFocusSheet({
  open,
  onOpenChange,
  list,
  tasks,
  onOpenTask,
}: BoardListFocusSheetProps) {
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return tasks
    }
    return tasks.filter((task) => task.title.toLowerCase().includes(normalized))
  }, [query, tasks])

  const doneCount = tasks.filter((task) => task.status === "done").length
  const colorClasses = list ? getBoardListColorClasses(list.color) : null

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setQuery("")
        }
        onOpenChange(next)
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
        <SheetHeader className="border-b border-border/60 px-6 py-4 text-left">
          <div className="flex items-center gap-2">
            {colorClasses ? <span className={cn("size-2.5 rounded-full", colorClasses.bar)} /> : null}
            <SheetTitle>{list?.name ?? "List"}</SheetTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {tasks.length} cards · {doneCount} done · {tasks.length - doneCount} remaining
          </p>
        </SheetHeader>

        <div className="border-b border-border/60 px-6 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search cards in this list…"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No cards match your search.
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((task) => (
                <li key={task.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onOpenTask(task.id)
                      onOpenChange(false)
                    }}
                    className="flex w-full items-start gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left hover:border-border/60 hover:bg-muted/40"
                  >
                    {task.status === "done" ? (
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    ) : (
                      <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium leading-snug">{task.title}</span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="font-mono">{task.identifier}</span>
                        {task.checklist_total > 0 ? (
                          <span>
                            {task.checklist_done}/{task.checklist_total} checklist
                          </span>
                        ) : null}
                        <span className="capitalize">{task.status.replace(/_/g, " ")}</span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
