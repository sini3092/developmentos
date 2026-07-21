"use client"

import Link from "next/link"
import { Hash } from "lucide-react"

import type { ProjectChannel } from "@/lib/database.types"
import { cn } from "@/lib/utils"

type ChannelSidebarProps = {
  slug: string
  channels: ProjectChannel[]
  activeChannelSlug?: string
}

export function ChannelSidebar({ slug, channels, activeChannelSlug }: ChannelSidebarProps) {
  return (
    <aside className="flex h-full min-h-0 w-56 shrink-0 flex-col overflow-hidden border-r border-border/60 bg-surface-raised/30">
      <div className="shrink-0 border-b border-border/60 px-4 py-3">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Channels
        </h2>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overscroll-contain p-2">
        {channels.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">No channels yet.</p>
        ) : (
          channels.map((channel) => {
            const href = `/projects/${slug}/channels/${channel.slug}`
            const isActive = channel.slug === activeChannelSlug

            return (
              <Link
                key={channel.id}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Hash className="size-3.5 shrink-0 opacity-60" />
                <span className="truncate">{channel.name}</span>
              </Link>
            )
          })
        )}
      </nav>
    </aside>
  )
}
