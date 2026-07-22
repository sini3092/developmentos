"use client"

import { useMemo, useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import { SoulsActionCard, SoulsWorkingSteps } from "@/components/souls/souls-action-card"
import type { SoulsPrivateMessage } from "@/lib/database.types"
import { useStickToBottom } from "@/hooks/use-stick-to-bottom"
import { parseSoulsMessageMetadata } from "@/lib/souls/message-metadata"
import { cn } from "@/lib/utils"

const COLLAPSE_CHAR_LIMIT = 480
const COLLAPSE_LINE_LIMIT = 8

function messageSignature(messages: SoulsPrivateMessage[]) {
  return messages
    .map((message) => {
      const metadata = parseSoulsMessageMetadata(message.metadata)
      return `${message.id}:${message.status}:${message.body.length}:${message.created_at}:${metadata.actions?.length ?? 0}:${metadata.workingLabel ?? ""}`
    })
    .join("|")
}

export function SoulsMessageList({ messages }: { messages: SoulsPrivateMessage[] }) {
  const signature = useMemo(() => messageSignature(messages), [messages])
  const scrollRef = useStickToBottom<HTMLDivElement>(signature)

  if (messages.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="font-serif text-lg font-medium">Private counsel</p>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          Only you and Souls see this thread. Send lore, ask for structure, or let her
          create tasks on the board.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4"
    >
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <SoulsMessageBubble key={message.id} message={message} />
        ))}
      </div>
    </div>
  )
}

function SoulsMessageBubble({ message }: { message: SoulsPrivateMessage }) {
  const metadata = parseSoulsMessageMetadata(message.metadata)
  const isUser = message.role === "user"
  const isWorking = message.status === "working"
  const isError = message.status === "error"

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
              "rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
              isUser
                ? "rounded-br-md bg-primary text-primary-foreground"
                : isError
                  ? "rounded-bl-md border border-danger/30 bg-danger/5 text-foreground"
                  : "rounded-bl-md border border-border/60 bg-card text-foreground"
            )}
          >
            <CollapsibleMessageBody body={message.body} isUser={isUser} />
          </div>
        ) : null}

        {metadata.actions?.map((action, index) => (
          <SoulsActionCard key={`${message.id}-action-${index}`} action={action} />
        ))}

        {isError && !message.body ? (
          <p className="text-xs text-danger">Something went wrong.</p>
        ) : null}
      </div>
    </div>
  )
}

function CollapsibleMessageBody({ body, isUser }: { body: string; isUser: boolean }) {
  const lineCount = body.split("\n").length
  const shouldCollapse =
    body.length > COLLAPSE_CHAR_LIMIT || lineCount > COLLAPSE_LINE_LIMIT
  const [expanded, setExpanded] = useState(!shouldCollapse)

  if (!shouldCollapse) {
    return <p className="whitespace-pre-wrap">{body}</p>
  }

  const preview = expanded
    ? body
    : body
        .slice(0, COLLAPSE_CHAR_LIMIT)
        .split("\n")
        .slice(0, COLLAPSE_LINE_LIMIT)
        .join("\n")
        .trimEnd() + "…"

  return (
    <div className="space-y-2">
      <p className="whitespace-pre-wrap">{preview}</p>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium underline-offset-2 hover:underline",
          isUser ? "text-primary-foreground/90" : "text-muted-foreground"
        )}
      >
        {expanded ? (
          <>
            Show less
            <ChevronUp className="size-3" />
          </>
        ) : (
          <>
            Show full message ({lineCount} lines)
            <ChevronDown className="size-3" />
          </>
        )}
      </button>
    </div>
  )
}
