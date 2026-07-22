"use client"

import { useCallback, useEffect, useState } from "react"

import type { SoulsPrivateMessage } from "@/lib/database.types"
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

  const isWorking = messages.some(
    (message) => message.role === "assistant" && message.status === "working"
  )

  return { messages, reloadMessages, isWorking }
}
