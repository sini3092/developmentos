"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { cancelSoulsPrivateWork } from "@/lib/actions/souls-chat"
import type { SoulsPrivateMessage } from "@/lib/database.types"
import { isSoulsMessageStale } from "@/lib/souls/stale-messages"
import { createClient } from "@/lib/supabase/client"

type UseSoulsChatLiveOptions = {
  conversationId: string | null
  initialMessages: SoulsPrivateMessage[]
}

export function useSoulsChatLive({
  conversationId,
  initialMessages,
}: UseSoulsChatLiveOptions) {
  const [messages, setMessages] = useState(initialMessages)
  const [releasing, setReleasing] = useState(false)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  const reloadMessages = useCallback(async () => {
    if (!conversationId) {
      return
    }

    const supabase = createClient()
    const { data } = await supabase
      .from("souls_private_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (data) {
      setMessages(data)
    }
  }, [conversationId])

  useEffect(() => {
    if (!conversationId) {
      return
    }

    void reloadMessages()

    const supabase = createClient()
    const channel = supabase
      .channel(`souls-chat:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "souls_private_messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => {
          void reloadMessages()
        }
      )
      .subscribe()

    const intervalId = window.setInterval(() => {
      void reloadMessages()
    }, 2000)

    return () => {
      window.clearInterval(intervalId)
      void supabase.removeChannel(channel)
    }
  }, [conversationId, reloadMessages])

  const workingMessage = useMemo(
    () => messages.find((message) => message.role === "assistant" && message.status === "working"),
    [messages]
  )

  const isStaleWorking = workingMessage ? isSoulsMessageStale(workingMessage) : false
  const isWorking = Boolean(workingMessage) && !isStaleWorking

  useEffect(() => {
    if (!conversationId || !isStaleWorking || releasing) {
      return
    }

    setReleasing(true)
    void cancelSoulsPrivateWork(conversationId)
      .then(() => reloadMessages())
      .finally(() => setReleasing(false))
  }, [conversationId, isStaleWorking, releasing, reloadMessages])

  const releaseSouls = useCallback(async () => {
    if (!conversationId) {
      return
    }

    setReleasing(true)
    try {
      await cancelSoulsPrivateWork(conversationId)
      await reloadMessages()
    } finally {
      setReleasing(false)
    }
  }, [conversationId, reloadMessages])

  return {
    messages,
    reloadMessages,
    isWorking,
    isStaleWorking,
    releasing,
    releaseSouls,
    workingMessage,
  }
}
