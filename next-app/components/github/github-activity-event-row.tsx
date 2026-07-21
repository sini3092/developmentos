"use client"

import { useState } from "react"

import { GithubEventDetailDialog } from "@/components/github/github-event-detail-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  formatActivityEventMessage,
  formatActivityEventType,
  isGithubActivityEvent,
} from "@/lib/utils/activity"
import { getInitials } from "@/lib/utils/format"
import { cn } from "@/lib/utils"

type GithubActivityEventRowProps = {
  slug: string
  eventType: string
  message: string | null
  newValue: unknown
  createdAt: string
  actorDisplayName?: string | null
  className?: string
  compact?: boolean
}

export function GithubActivityEventRow({
  slug,
  eventType,
  message,
  newValue,
  createdAt,
  actorDisplayName,
  className,
  compact = false,
}: GithubActivityEventRowProps) {
  const [open, setOpen] = useState(false)
  const showGithubDialog = isGithubActivityEvent(eventType)

  const content = compact ? (
    <>
      <p className="text-xs font-medium text-muted-foreground">
        {formatActivityEventType(eventType)}
      </p>
      <p>{formatActivityEventMessage(eventType, message, newValue)}</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {new Date(createdAt).toLocaleString()}
        {showGithubDialog ? " · Click to view changes" : ""}
      </p>
    </>
  ) : (
    <>
      <Avatar className="size-8 rounded-md">
        <AvatarFallback className="rounded-md text-xs">
          {getInitials(actorDisplayName, "GH")}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{actorDisplayName ?? "GitHub"}</span>
          <Badge variant="outline" className="font-normal">
            {formatActivityEventType(eventType)}
          </Badge>
        </div>
        <p className="text-sm">{formatActivityEventMessage(eventType, message, newValue)}</p>
        <p className="text-xs text-muted-foreground">
          {new Date(createdAt).toLocaleString()}
          {showGithubDialog ? " · Click to view changes" : ""}
        </p>
      </div>
    </>
  )

  if (!showGithubDialog) {
    return (
      <article
        className={cn(
          compact
            ? "rounded-xl border border-border/60 bg-card px-4 py-3 text-sm shadow-xs"
            : "flex gap-3 rounded-xl border border-border/60 bg-card p-4 shadow-xs",
          className
        )}
      >
        {content}
      </article>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          compact
            ? "block w-full rounded-xl border border-border/60 bg-card px-4 py-3 text-left text-sm shadow-xs transition-colors hover:border-info/40 hover:bg-info/5"
            : "flex w-full gap-3 rounded-xl border border-border/60 bg-card p-4 text-left shadow-xs transition-colors hover:border-info/40 hover:bg-info/5",
          className
        )}
      >
        {content}
      </button>
      {open ? (
        <GithubEventDetailDialog
          open={open}
          onOpenChange={setOpen}
          slug={slug}
          eventType={eventType}
          message={message}
          newValue={newValue}
          createdAt={createdAt}
          actorDisplayName={actorDisplayName}
        />
      ) : null}
    </>
  )
}
