"use client"

import { useEffect, useRef } from "react"

import { createClient } from "@/lib/supabase/client"

type UseProjectTasksLiveOptions = {
  projectId: string
  enabled?: boolean
  onRemoteChange: (taskId: string | null) => void
  isDragging?: () => boolean
}

export function useProjectTasksLive({
  projectId,
  enabled = true,
  onRemoteChange,
  isDragging,
}: UseProjectTasksLiveOptions) {
  const onRemoteChangeRef = useRef(onRemoteChange)
  const isDraggingRef = useRef(isDragging)
  const pendingTaskIdRef = useRef<string | null>(null)
  const timerRef = useRef<number | null>(null)
  const flushRef = useRef<() => void>(() => {})

  useEffect(() => {
    onRemoteChangeRef.current = onRemoteChange
  }, [onRemoteChange])

  useEffect(() => {
    isDraggingRef.current = isDragging
  }, [isDragging])

  useEffect(() => {
    if (!enabled || !projectId) {
      return
    }

    const supabase = createClient()

    function flush() {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
      }
      const nextTaskId = pendingTaskIdRef.current
      pendingTaskIdRef.current = null
      onRemoteChangeRef.current(nextTaskId)
    }

    flushRef.current = flush

    function schedule(taskId: string | null) {
      if (taskId) {
        pendingTaskIdRef.current = taskId
      }

      if (isDraggingRef.current?.()) {
        return
      }

      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }

      timerRef.current = window.setTimeout(flush, 500)
    }

    const channel = supabase
      .channel(`project-tasks-live:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const record = payload.eventType === "DELETE" ? payload.old : payload.new
          const taskId = String((record as { id?: string }).id ?? "")
          schedule(taskId || null)
        }
      )
      .subscribe()

    return () => {
      flushRef.current = () => {}
      if (timerRef.current) {
        window.clearTimeout(timerRef.current)
      }
      void supabase.removeChannel(channel)
    }
  }, [enabled, projectId])

  return {
    flushPending: () => flushRef.current(),
  }
}
