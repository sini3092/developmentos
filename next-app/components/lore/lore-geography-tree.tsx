"use client"

import Link from "next/link"
import { useState } from "react"
import { ChevronRight, MapPin } from "lucide-react"

import type { LoreGeographyNode } from "@/lib/auth/lore-world-context"
import { loreTypeLabel } from "@/lib/constants/lore-navigation"
import { cn } from "@/lib/utils"

type LoreGeographyTreeProps = {
  slug: string
  roots: LoreGeographyNode[]
}

function GeographyNode({
  node,
  slug,
  depth,
}: {
  node: LoreGeographyNode
  slug: string
  depth: number
}) {
  const [open, setOpen] = useState(depth < 2)
  const hasChildren = node.children.length > 0

  return (
    <li>
      <div className="flex items-center gap-1 py-1">
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted"
            aria-label={open ? "Collapse" : "Expand"}
          >
            <ChevronRight className={cn("size-3.5 transition-transform", open && "rotate-90")} />
          </button>
        ) : (
          <span className="size-4" />
        )}
        <Link
          href={`/projects/${slug}/lore/${node.slug}`}
          className="text-sm hover:text-info"
        >
          {node.name}
        </Link>
        <span className="text-xs text-muted-foreground">({loreTypeLabel(node.entry_type)})</span>
      </div>
      {hasChildren && open ? (
        <ul className="ml-4 border-l border-border/50 pl-2">
          {node.children.map((child) => (
            <GeographyNode key={child.id} node={child} slug={slug} depth={depth + 1} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function LoreGeographyTree({ slug, roots }: LoreGeographyTreeProps) {
  if (roots.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/80 p-10 text-center">
        <MapPin className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-4 text-sm font-medium">No geographic hierarchy yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Add regions, locations, and settlements, then link them with parent or located-in
          relationships.
        </p>
      </div>
    )
  }

  return (
    <ul className="rounded-xl border border-border/60 bg-card p-4">
      {roots.map((node) => (
        <GeographyNode key={node.id} node={node} slug={slug} depth={0} />
      ))}
    </ul>
  )
}
