"use client"

import { useMemo, useState, useTransition } from "react"
import { CheckCircle2, Circle, Sparkles } from "lucide-react"

import { triageDevInboxWithSouls } from "@/lib/actions/board-inbox"
import { moveTaskOnBoard } from "@/lib/actions/tasks"
import type { TaskWithPeople } from "@/lib/auth/task-context"
import type { BoardList } from "@/lib/database.types"
import { getBoardListColorClasses } from "@/lib/constants/board-lists"
import { buildBoardInboxTriagePrompt, findDoneListForBoard, isBoardInboxList } from "@/lib/tasks/board-inbox"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useUiStore } from "@/lib/stores/ui-store"
import { cn } from "@/lib/utils"

type BoardListFocusSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  list: BoardList | null
  tasks: TaskWithPeople[]
  allLists: BoardList[]
  slug: string
  projectId: string
  canEdit: boolean
  onOpenTask: (taskId: string) => void
  onBoardRefresh?: () => Promise<void>
}

export function BoardListFocusSheet({
  open,
  onOpenChange,
  list,
  tasks,
  allLists,
  slug,
  projectId,
  canEdit,
  onOpenTask,
  onBoardRefresh,
}: BoardListFocusSheetProps) {
  const [query, setQuery] = useState("")
  const [isPending, startTransition] = useTransition()
  const [triageError, setTriageError] = useState<string | null>(null)
  const { activeWorkspace } = useWorkspace()
  const setSoulsPanelOpen = useUiStore((state) => state.setSoulsPanelOpen)
  const setSoulsPrefillBody = useUiStore((state) => state.setSoulsPrefillBody)
  const setSoulsOpenAfterSend = useUiStore((state) => state.setSoulsOpenAfterSend)

  const isInbox = list ? isBoardInboxList(list) : false
  const moveTargets = useMemo(
    () => allLists.filter((item) => item.id !== list?.id),
    [allLists, list?.id]
  )
  const doneList = useMemo(
    () => (list ? findDoneListForBoard(allLists, list.board_key) : null),
    [allLists, list]
  )

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return tasks
    }
    return tasks.filter((task) => task.title.toLowerCase().includes(normalized))
  }, [query, tasks])

  const doneCount = tasks.filter((task) => task.status === "done").length
  const colorClasses = list ? getBoardListColorClasses(list.color) : null

  function refreshBoard() {
    startTransition(async () => {
      await onBoardRefresh?.()
    })
  }

  function handleMove(taskId: string, targetListId: string) {
    if (!targetListId) return
    startTransition(async () => {
      await moveTaskOnBoard(slug, taskId, targetListId, 0)
      await onBoardRefresh?.()
    })
  }

  function handleMarkDone(taskId: string) {
    if (!doneList) return
    handleMove(taskId, doneList.id)
  }

  function handleSoulsTriage(autoSend: boolean) {
    setTriageError(null)
    if (!activeWorkspace) {
      setTriageError("Select a workspace first.")
      return
    }

    if (autoSend) {
      const formData = new FormData()
      formData.set("workspaceId", activeWorkspace.id)
      formData.set("projectId", projectId)
      formData.set("projectSlug", slug)
      startTransition(async () => {
        const result = await triageDevInboxWithSouls({}, formData)
        if (result.error) {
          setTriageError(result.error)
          return
        }
        setSoulsOpenAfterSend(true)
        setSoulsPanelOpen(true)
        await onBoardRefresh?.()
      })
      return
    }

    setSoulsPrefillBody(
      buildBoardInboxTriagePrompt({
        tasks,
        lists: allLists,
      })
    )
    setSoulsPanelOpen(true)
  }

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setQuery("")
          setTriageError(null)
        }
        onOpenChange(next)
      }}
    >
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="border-b border-border/60 px-6 py-4 text-left">
          <div className="flex items-center gap-2">
            {colorClasses ? <span className={cn("size-2.5 rounded-full", colorClasses.bar)} /> : null}
            <SheetTitle>{list?.name ?? "List"}</SheetTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            {tasks.length} cards · {doneCount} done · {tasks.length - doneCount} remaining
          </p>
          {isInbox && canEdit ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                type="button"
                size="sm"
                disabled={isPending || tasks.length === 0}
                onClick={() => handleSoulsTriage(true)}
              >
                <Sparkles className="size-3.5" />
                Souls triage inbox
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={isPending || tasks.length === 0}
                onClick={() => handleSoulsTriage(false)}
              >
                Edit prompt in Souls
              </Button>
            </div>
          ) : null}
          {triageError ? <p className="text-xs text-danger">{triageError}</p> : null}
        </SheetHeader>

        <div className="border-b border-border/60 px-6 py-3">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search cards in this list…"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No cards match your search.
            </p>
          ) : (
            <ul className="space-y-2">
              {filtered.map((task) => (
                <li
                  key={task.id}
                  className="rounded-lg border border-border/60 bg-card px-3 py-2.5"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onOpenTask(task.id)
                        onOpenChange(false)
                      }}
                      className="mt-0.5 shrink-0"
                    >
                      {task.status === "done" ? (
                        <CheckCircle2 className="size-4 text-success" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => {
                          onOpenTask(task.id)
                          onOpenChange(false)
                        }}
                        className="text-left"
                      >
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
                      </button>

                      {canEdit ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <select
                            defaultValue=""
                            disabled={isPending}
                            onChange={(event) => {
                              const value = event.target.value
                              if (!value) return
                              handleMove(task.id, value)
                              event.target.value = ""
                            }}
                            className="h-8 max-w-[220px] flex-1 rounded-lg border border-input bg-background px-2 text-xs"
                          >
                            <option value="">Move to…</option>
                            {moveTargets.map((target) => (
                              <option key={target.id} value={target.id}>
                                {target.board_key} / {target.name}
                              </option>
                            ))}
                          </select>
                          {doneList ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isPending || task.status === "done"}
                              onClick={() => handleMarkDone(task.id)}
                            >
                              Done
                            </Button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {canEdit ? (
          <div className="border-t border-border/60 px-6 py-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={refreshBoard}
            >
              Refresh board
            </Button>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
