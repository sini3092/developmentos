"use client"

import { useCallback, useEffect, useState } from "react"

import type { ChannelMessageNode } from "@/lib/auth/channels-context"
import { fetchChannelMessagesClient } from "@/lib/channels/fetch-channel-messages-client"
import { createClient } from "@/lib/supabase/client"

type UseChannelMessagesLiveOptions = {
  channelId: string
  initialMessages: ChannelMessageNode[]
  poll?: boolean
}

export function useChannelMessagesLive({
  channelId,
  initialMessages,
  poll = false,
}: UseChannelMessagesLiveOptions) {
  const [messages, setMessages] = useState(initialMessages)

  useEffect(() => {
    setMessages(initialMessages)
  }, [initialMessages])

  const reloadMessages = useCallback(async () => {
    if (!channelId) {
      return
    }

    const nextMessages = await fetchChannelMessagesClient(channelId)
    setMessages(nextMessages)
  }, [channelId])

  useEffect(() => {
    if (!channelId) {
      return
    }

    void reloadMessages()

    const supabase = createClient()
    const channel = supabase
      .channel(`channel-messages-live:${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "channel_messages",
          filter: `channel_id=eq.${channelId}`,
        },
        () => {
          void reloadMessages()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [channelId, reloadMessages])

  useEffect(() => {
    if (!poll) {
      return
    }

    const intervalId = window.setInterval(() => {
      void reloadMessages()
    }, 2000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [poll, reloadMessages])

  return {
    messages,
    reloadMessages,
  }
}
