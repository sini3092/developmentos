"use client"

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react"

import type { TaskDetail, TaskListFilters, TaskWithPeople } from "@/lib/auth/task-context"
import type {
  Initiative,
  Milestone,
  ProjectMemberWithProfile,
} from "@/lib/database.types"
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet"
import { useProjectTasksLive } from "@/hooks/use-project-tasks-live"
import { queryBoardTasks } from "@/lib/tasks/query-board-tasks"
import { createClient } from "@/lib/supabase/client"

type TaskBoardLiveProps = {
  slug: string
  projectId: string
  initialTasks: TaskWithPeople[]
  filters: TaskListFilters
  members: ProjectMemberWithProfile[]
  initiatives: Pick<Initiative, "id" | "name" | "slug">[]
  milestones: Array<Pick<Milestone, "id" | "name" | "slug" | "initiative_id">>
  initialSelectedTask: TaskDetail | null
  repoOwner?: string | null
  repoName?: string | null
  canEdit: boolean
  children: (props: {
    tasks: TaskWithPeople[]
    highlightedTaskIds: Set<string>
    onDragActiveChange: (active: boolean) => void
  }) => ReactNode
}

export function TaskBoardLive({
  slug,
  projectId,
  initialTasks,
  filters,
  members,
  initiatives,
  milestones,
  initialSelectedTask,
  repoOwner,
  repoName,
  canEdit,
  children,
}: TaskBoardLiveProps) {
  const [tasks, setTasks] = useState(initialTasks)
  const [selectedTask, setSelectedTask] = useState(initialSelectedTask)
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set())
  const [newCommentIds, setNewCommentIds] = useState<Set<string>>(new Set())
  const [newChecklistIds, setNewChecklistIds] = useState<Set<string>>(new Set())
  const isDraggingRef = useRef(false)
  const selectedTaskIdRef = useRef(initialSelectedTask?.id ?? null)
  const previousCommentIdsRef = useRef(new Set(initialSelectedTask?.comments.map((c) => c.id) ?? []))
  const previousChecklistIdsRef = useRef(
    new Set(initialSelectedTask?.checklist_items.map((item) => item.id) ?? [])
  )

  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  useEffect(() => {
    setSelectedTask(initialSelectedTask)
    selectedTaskIdRef.current = initialSelectedTask?.id ?? null
    previousCommentIdsRef.current = new Set(initialSelectedTask?.comments.map((c) => c.id) ?? [])
    previousChecklistIdsRef.current = new Set(
      initialSelectedTask?.checklist_items.map((item) => item.id) ?? []
    )
    setNewCommentIds(new Set())
    setNewChecklistIds(new Set())
  }, [initialSelectedTask])

  const markHighlighted = useCallback((taskId: string | null) => {
    if (!taskId) return
    setHighlightedTaskIds((current) => new Set(current).add(taskId))
    window.setTimeout(() => {
      setHighlightedTaskIds((current) => {
        const next = new Set(current)
        next.delete(taskId)
        return next
      })
    }, 1600)
  }, [])

  const refreshBoard = useCallback(async () => {
    const supabase = createClient()
    const nextTasks = await queryBoardTasks(supabase, projectId, filters)
    setTasks(nextTasks)
  }, [filters, projectId])

  const refreshSelectedTask = useCallback(async () => {
    const taskId = selectedTaskIdRef.current
    if (!taskId) return

    const response = await fetch(`/api/projects/${slug}/tasks/${taskId}`)
    if (!response.ok) return

    const nextTask = (await response.json()) as TaskDetail

    const nextCommentIds = new Set(nextTask.comments.map((comment) => comment.id))
    const addedComments = [...nextCommentIds].filter(
      (id) => !previousCommentIdsRef.current.has(id)
    )
    if (addedComments.length > 0) {
      setNewCommentIds(new Set(addedComments))
      window.setTimeout(() => setNewCommentIds(new Set()), 1600)
    }
    previousCommentIdsRef.current = nextCommentIds

    const nextChecklistIds = new Set(nextTask.checklist_items.map((item) => item.id))
    const addedChecklist = [...nextChecklistIds].filter(
      (id) => !previousChecklistIdsRef.current.has(id)
    )
    if (addedChecklist.length > 0) {
      setNewChecklistIds(new Set(addedChecklist))
      window.setTimeout(() => setNewChecklistIds(new Set()), 1600)
    }
    previousChecklistIdsRef.current = nextChecklistIds

    setSelectedTask(nextTask)
  }, [slug])

  const handleRemoteChange = useCallback(
    async (taskId: string | null) => {
      await refreshBoard()
      if (taskId) {
        markHighlighted(taskId)
      }
      if (taskId && taskId === selectedTaskIdRef.current) {
        await refreshSelectedTask()
      }
    },
    [markHighlighted, refreshBoard, refreshSelectedTask]
  )

  const { flushPending } = useProjectTasksLive({
    projectId,
    onRemoteChange: handleRemoteChange,
    isDragging: () => isDraggingRef.current,
  })

  return (
    <>
      {children({
        tasks,
        highlightedTaskIds,
        onDragActiveChange: (active) => {
          const wasDragging = isDraggingRef.current
          isDraggingRef.current = active
          if (wasDragging && !active) {
            flushPending()
          }
        },
      })}
      <TaskDetailSheet
        task={selectedTask}
        slug={slug}
        members={members}
        initiatives={initiatives}
        milestones={milestones}
        repoOwner={repoOwner}
        repoName={repoName}
        canEdit={canEdit}
        highlightedCommentIds={newCommentIds}
        highlightedChecklistIds={newChecklistIds}
      />
    </>
  )
}
