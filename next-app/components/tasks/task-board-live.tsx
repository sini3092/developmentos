"use client"

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { useSearchParams } from "next/navigation"

import type { TaskDetail, TaskListFilters, TaskWithPeople } from "@/lib/auth/task-context"
import type { ProjectMemberWithProfile } from "@/lib/database.types"
import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet"
import { useProjectTasksLive } from "@/hooks/use-project-tasks-live"
import { queryBoardTasks } from "@/lib/tasks/query-board-tasks"
import { fetchTaskDetailClient } from "@/lib/tasks/fetch-task-detail-client"
import { filterTasksClient } from "@/lib/utils/filter-tasks-client"
import { createClient } from "@/lib/supabase/client"

type TaskBoardLiveProps = {
  slug: string
  projectId: string
  initialTasks: TaskWithPeople[]
  initialFilters: TaskListFilters
  members: ProjectMemberWithProfile[]
  repoOwner?: string | null
  repoName?: string | null
  canEdit: boolean
  children: (props: {
    tasks: TaskWithPeople[]
    filters: TaskListFilters
    onFiltersChange: (filters: TaskListFilters) => void
    onDragActiveChange: (active: boolean) => void
    onTasksChange: (tasks: TaskWithPeople[]) => void
    onTaskCreated: (taskId: string) => void
    onBoardRefresh: () => Promise<void>
    onOpenTask: (taskId: string) => void
    onPrefetchTask: (taskId: string) => void
  }) => ReactNode
}

function toTaskShell(task: TaskWithPeople): TaskDetail {
  return {
    ...task,
    comments: [],
    initiative: null,
    milestone: null,
    checklist_items: [],
    pull_requests: [],
    branches: [],
    attachments: [],
    linked_assets: [],
    linked_decisions: [],
    linked_design_documents: [],
    linked_lore_entries: [],
    blocked_by: [],
    blocks: [],
  }
}

function createLoadingTaskDetail(taskId: string, projectId: string): TaskDetail {
  const now = new Date().toISOString()

  return {
    id: taskId,
    workspace_id: "",
    project_id: projectId,
    number: 0,
    identifier: "…",
    title: "Loading…",
    description: null,
    status: "backlog",
    priority: "none",
    assignee_id: null,
    creator_id: "",
    discipline: null,
    parent_task_id: null,
    start_date: null,
    due_date: null,
    estimate_hours: null,
    progress: 0,
    board_position: 0,
    list_id: null,
    initiative_id: null,
    milestone_id: null,
    deleted_at: null,
    created_at: now,
    updated_at: now,
    assignee: null,
    creator: null,
    comment_count: 0,
    labels: [],
    checklist_done: 0,
    checklist_total: 0,
    checklist_preview: [],
    attachment_count: 0,
    comments: [],
    initiative: null,
    milestone: null,
    checklist_items: [],
    pull_requests: [],
    branches: [],
    attachments: [],
    linked_assets: [],
    linked_decisions: [],
    linked_design_documents: [],
    linked_lore_entries: [],
    blocked_by: [],
    blocks: [],
  }
}

export function TaskBoardLive({
  slug,
  projectId,
  initialTasks,
  initialFilters,
  members,
  repoOwner,
  repoName,
  canEdit,
  children,
}: TaskBoardLiveProps) {
  const searchParams = useSearchParams()
  const [allTasks, setAllTasks] = useState(initialTasks)
  const [filters, setFilters] = useState(initialFilters)
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const isDraggingRef = useRef(false)
  const skipTasksSyncRef = useRef(false)
  const selectedTaskIdRef = useRef<string | null>(null)
  const taskCacheRef = useRef(new Map<string, TaskDetail>())
  const prefetchingRef = useRef(new Set<string>())
  const openedFromUrlRef = useRef(false)

  const visibleTasks = useMemo(() => filterTasksClient(allTasks, filters), [allTasks, filters])

  useEffect(() => {
    if (skipTasksSyncRef.current) {
      skipTasksSyncRef.current = false
      return
    }
    if (isDraggingRef.current) return
    setAllTasks(initialTasks)
  }, [initialTasks])

  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.listId && filters.listId !== "all") params.set("list", filters.listId)
    if (filters.assigneeId && filters.assigneeId !== "all") {
      params.set("assignee", filters.assigneeId)
    }
    if (filters.search?.trim()) params.set("q", filters.search.trim())
    if (filters.priority && filters.priority !== "all") params.set("priority", filters.priority)
    if (filters.discipline && filters.discipline !== "all") {
      params.set("discipline", filters.discipline)
    }
    if (filters.labelId && filters.labelId !== "all") params.set("label", filters.labelId)
    if (filters.milestoneId && filters.milestoneId !== "all") {
      params.set("milestone", filters.milestoneId)
    }

    const taskId = new URLSearchParams(window.location.search).get("task")
    if (taskId) params.set("task", taskId)

    const query = params.toString()
    const nextUrl = query
      ? `/projects/${slug}/tasks/board?${query}`
      : `/projects/${slug}/tasks/board`
    window.history.replaceState(null, "", nextUrl)
  }, [filters, slug])

  const loadTaskDetail = useCallback(
    async (taskId: string) => {
      const cached = taskCacheRef.current.get(taskId)
      if (cached) return cached

      const supabase = createClient()
      const nextTask = await fetchTaskDetailClient(supabase, projectId, taskId)
      if (nextTask) {
        taskCacheRef.current.set(taskId, nextTask)
      }
      return nextTask
    },
    [projectId]
  )

  const refreshBoard = useCallback(async () => {
    const supabase = createClient()
    const nextTasks = await queryBoardTasks(supabase, projectId)
    skipTasksSyncRef.current = true
    setAllTasks(nextTasks)
  }, [projectId])

  const refreshSelectedTask = useCallback(async () => {
    const taskId = selectedTaskIdRef.current
    if (!taskId) return

    taskCacheRef.current.delete(taskId)
    const nextTask = await loadTaskDetail(taskId)
    if (!nextTask) return

    setSelectedTask(nextTask)

    setAllTasks((current) =>
      current.map((task) =>
        task.id === nextTask.id
          ? {
              ...task,
              title: nextTask.title,
              description: nextTask.description,
              progress: nextTask.progress,
              comment_count: nextTask.comments.length,
              checklist_total: nextTask.checklist_items.length,
              checklist_done: nextTask.checklist_items.filter((item) => item.completed).length,
              checklist_preview: nextTask.checklist_items.slice(0, 3).map((item) => ({
                id: item.id,
                title: item.title,
                completed: item.completed,
              })),
            }
          : task
      )
    )
  }, [loadTaskDetail])

  const openTask = useCallback(
    (taskId: string) => {
      selectedTaskIdRef.current = taskId

      const url = new URL(window.location.href)
      url.searchParams.set("task", taskId)
      window.history.replaceState(null, "", url.toString())

      const cached = taskCacheRef.current.get(taskId)
      if (cached) {
        setSelectedTask(cached)
        setIsLoadingDetail(false)
        return
      }

      const fromBoard = allTasks.find((task) => task.id === taskId)
      setSelectedTask(
        fromBoard ? toTaskShell(fromBoard) : createLoadingTaskDetail(taskId, projectId)
      )
      setIsLoadingDetail(true)

      void loadTaskDetail(taskId).then((nextTask) => {
        if (!nextTask || selectedTaskIdRef.current !== taskId) return
        setSelectedTask(nextTask)
        setIsLoadingDetail(false)
      })
    },
    [allTasks, loadTaskDetail, projectId]
  )

  const prefetchTask = useCallback(
    (taskId: string) => {
      if (taskCacheRef.current.has(taskId) || prefetchingRef.current.has(taskId)) return
      prefetchingRef.current.add(taskId)
      void loadTaskDetail(taskId).finally(() => {
        prefetchingRef.current.delete(taskId)
      })
    },
    [loadTaskDetail]
  )

  useEffect(() => {
    if (openedFromUrlRef.current) return
    const taskId = searchParams.get("task")
    if (!taskId) return
    openedFromUrlRef.current = true
    openTask(taskId)
  }, [openTask, searchParams])

  const closeTask = useCallback(() => {
    selectedTaskIdRef.current = null
    setSelectedTask(null)
    setIsLoadingDetail(false)

    const url = new URL(window.location.href)
    url.searchParams.delete("task")
    window.history.replaceState(null, "", url.pathname + url.search)
  }, [])

  const handleRemoteChange = useCallback(
    async (taskId: string | null) => {
      if (isDraggingRef.current) return
      if (taskId && taskId === selectedTaskIdRef.current) {
        await refreshSelectedTask()
      }
    },
    [refreshSelectedTask]
  )

  const handleTasksChange = useCallback((nextVisibleTasks: TaskWithPeople[]) => {
    skipTasksSyncRef.current = true
    setAllTasks((current) => {
      const nextById = new Map(current.map((task) => [task.id, task]))
      for (const task of nextVisibleTasks) {
        nextById.set(task.id, task)
      }
      return Array.from(nextById.values())
    })
  }, [])

  const handleTaskCreated = useCallback(
    (taskId: string) => {
      void refreshBoard()
      openTask(taskId)
    },
    [openTask, refreshBoard]
  )

  const handleTaskActivity = useCallback(() => {
    void refreshSelectedTask()
  }, [refreshSelectedTask])

  const { flushPending } = useProjectTasksLive({
    projectId,
    onRemoteChange: handleRemoteChange,
    isDragging: () => isDraggingRef.current,
  })

  return (
    <>
      {children({
        tasks: visibleTasks,
        filters,
        onFiltersChange: setFilters,
        onDragActiveChange: (active) => {
          const wasDragging = isDraggingRef.current
          isDraggingRef.current = active
          if (wasDragging && !active) {
            flushPending()
          }
        },
        onTasksChange: handleTasksChange,
        onTaskCreated: handleTaskCreated,
        onBoardRefresh: refreshBoard,
        onOpenTask: openTask,
        onPrefetchTask: prefetchTask,
      })}
      <TaskDetailSheet
        task={selectedTask}
        slug={slug}
        members={members}
        repoOwner={repoOwner}
        repoName={repoName}
        canEdit={canEdit}
        isLoading={isLoadingDetail}
        onClose={closeTask}
        onActivity={handleTaskActivity}
      />
    </>
  )
}
