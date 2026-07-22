"use client"

import Link from "next/link"

import type { LoreLinkTarget } from "@/lib/lore/internal-links"
import { LORE_ENTRY_TYPE_LABELS } from "@/lib/constants/knowledge"
import { LoreTypeBadge } from "@/components/lore/lore-badges"
import { cn } from "@/lib/utils"

type LoreEntryLinkProps = {
  projectSlug: string
  target: LoreLinkTarget
  label?: string
  className?: string
}

export function LoreEntryLink({ projectSlug, target, label, className }: LoreEntryLinkProps) {
  const href = `/projects/${projectSlug}/lore/${target.slug}`

  return (
    <span className={cn("group/link relative inline", className)}>
      <Link
        href={href}
        className="font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:text-primary/80"
      >
        {label ?? target.name}
      </Link>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-0 z-50 mb-2 hidden w-64 rounded-xl border border-border/60 bg-card p-3 text-left shadow-lg group-hover/link:block"
      >
        <div className="flex flex-wrap items-center gap-2">
          <LoreTypeBadge type={target.entry_type} />
        </div>
        <p className="mt-2 text-sm font-medium">{target.name}</p>
        {target.summary ? (
          <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{target.summary}</p>
        ) : (
          <p className="mt-1 text-xs text-muted-foreground">
            {LORE_ENTRY_TYPE_LABELS[target.entry_type]}
          </p>
        )}
      </span>
    </span>
  )
}
