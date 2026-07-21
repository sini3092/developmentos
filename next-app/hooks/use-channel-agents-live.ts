"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import { createClient } from "@/lib/supabase/client"
import type { AgentName } from "@/lib/utils/mentions"

export type ChannelAgentJob = {
  id: string
  trigger_message_id: string
  agent_name: AgentName
  status: string
  error: string | null
  updated_at: string
}

const ACTIVE_JOB_STATUSES = new Set(["awaiting_approval", "pending", "running"])
const TERMINAL_JOB_STATUSES = new Set(["completed", "failed", "cancelled"])

type UseChannelAgentsLiveOptions = {
  channelId: string
  enabled?: boolean
  onJobsChange?: () => void
}

export function useChannelAgentsLive({
  channelId,
  enabled = true,
  onJobsChange,
}: UseChannelAgentsLiveOptions) {
  const [jobs, setJobs] = useState<ChannelAgentJob[]>([])
  const onJobsChangeRef = useRef(onJobsChange)

  useEffect(() => {
    onJobsChangeRef.current = onJobsChange
  }, [onJobsChange])

  const loadJobs = useCallback(async () => {
    if (!channelId) {
      return
    }

    const supabase = createClient()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from("agent_jobs")
      .select("id, trigger_message_id, agent_name, status, error, updated_at")
      .eq("channel_id", channelId)
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })

    if (error) {
      return
    }

    const nextJobs = (data ?? [])
      .filter(
        (job): job is ChannelAgentJob =>
          job.agent_name === "personal" || job.agent_name === "souls"
      )
      .map((job) => ({
        id: job.id,
        trigger_message_id: job.trigger_message_id,
        agent_name: job.agent_name as AgentName,
        status: job.status,
        error: job.error,
        updated_at: job.updated_at,
      }))

    setJobs(nextJobs)
    onJobsChangeRef.current?.()
  }, [channelId])

  useEffect(() => {
    if (!enabled || !channelId) {
      return
    }

    void loadJobs()

    const supabase = createClient()
    const channel = supabase
      .channel(`channel-agents-live:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_jobs",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          void loadJobs()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "channel_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          onJobsChangeRef.current?.()
        }
      )
      .subscribe()

    const intervalId = window.setInterval(() => {
      void loadJobs()
    }, 2500)

    return () => {
      window.clearInterval(intervalId)
      void supabase.removeChannel(channel)
    }
  }, [channelId, enabled, loadJobs])

  const activeJobs = jobs.filter((job) => ACTIVE_JOB_STATUSES.has(job.status))

  return {
    jobs,
    activeJobs,
    hasActiveJobs: activeJobs.length > 0,
    reloadJobs: loadJobs,
  }
}

export function getJobsForMessage(jobs: ChannelAgentJob[], messageId: string) {
  return jobs.filter((job) => job.trigger_message_id === messageId)
}

export function isAgentJobActive(job: ChannelAgentJob) {
  return ACTIVE_JOB_STATUSES.has(job.status)
}

export function isAgentJobTerminal(job: ChannelAgentJob) {
  return TERMINAL_JOB_STATUSES.has(job.status)
}
