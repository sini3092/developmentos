"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Columns3, List, Network, Table2 } from "lucide-react"

import { cn } from "@/lib/utils"

type TasksViewToggleProps = {
  slug: string
}

export function TasksViewToggle({ slug }: TasksViewToggleProps) {
  const pathname = usePathname()
  const isBoard = pathname.endsWith("/board")
  const isTable = pathname.endsWith("/table")
  const isGraph = pathname.endsWith("/graph")

  const views = [
    { href: `/projects/${slug}/tasks`, label: "List", icon: List, active: !isBoard && !isTable && !isGraph },
    {
      href: `/projects/${slug}/tasks/table`,
      label: "Table",
      icon: Table2,
      active: isTable,
    },
    {
      href: `/projects/${slug}/tasks/board`,
      label: "Board",
      icon: Columns3,
      active: isBoard,
    },
    {
      href: `/projects/${slug}/tasks/graph`,
      label: "Graph",
      icon: Network,
      active: isGraph,
    },
  ]

  return (
    <div className="inline-flex rounded-lg border border-border/60 bg-muted/40 p-0.5">
      {views.map((view) => (
        <Link
          key={view.href}
          href={view.href}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            view.active
              ? "bg-background text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <view.icon className="size-3.5" />
          {view.label}
        </Link>
      ))}
    </div>
  )
}
