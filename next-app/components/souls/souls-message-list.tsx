"use client"

import { useMemo } from "react"

import { SoulsActionCard, SoulsWorkingSteps } from "@/components/souls/souls-action-card"
import type { SoulsPrivateMessage } from "@/lib/database.types"
import { parseSoulsMessageMetadata } from "@/lib/souls/message-metadata"
import { cn } from "@/lib/utils"

export function SoulsMessageList({ messages }: { messages: SoulsPrivateMessage[] }) {
  const items = useMemo(() => messages, [messages])

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="font-serif text-lg font-medium">Private counsel</p>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Only you and Souls see this thread. Send lore, ask for structure, or let her
          create tasks on the board.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      {items.map((message) => (
        <SoulsMessageBubble key={message.id} message={message} />
      ))}
    </div>
  )
}

function SoulsMessageBubble({ message }: { message: SoulsPrivateMessage }) {
  const metadata = parseSoulsMessageMetadata(message.metadata)
  const isUser = message.role === "user"
  const isWorking = message.status === "working"

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] space-y-2",
          isUser ? "items-end" : "items-start"
        )}
      >
        {!isUser ? (
          <p className="text-[10px] font-semibold tracking-wide text-primary uppercase">
            Souls
          </p>
        ) : null}

        {metadata.attachedLore ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs">
            <p className="font-medium">Attached lore: {metadata.attachedLore.name}</p>
            <p className="text-muted-foreground">{metadata.attachedLore.entryType}</p>
          </div>
        ) : null}

        {isWorking ? (
          <SoulsWorkingSteps label={metadata.workingLabel} />
        ) : message.body ? (
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
              isUser
                ? "rounded-br-md bg-primary text-primary-foreground"
                : "rounded-bl-md border border-border/60 bg-card text-foreground"
            )}
          >
            {message.body}
          </div>
        ) : null}

        {metadata.actions?.map((action, index) => (
          <SoulsActionCard key={`${message.id}-action-${index}`} action={action} />
        ))}

        {message.status === "error" ? (
          <p className="text-xs text-danger">Something went wrong.</p>
        ) : null}
      </div>
    </div>
  )
}
