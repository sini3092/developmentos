"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ScrollText } from "lucide-react"

import { LORE_SIDEBAR_LINKS } from "@/lib/constants/lore-navigation"
import { cn } from "@/lib/utils"

type LoreSidebarProps = {
  slug: string
}

export function LoreSidebar({ slug }: LoreSidebarProps) {
  const pathname = usePathname()
  const basePath = `/projects/${slug}/lore`

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border/60 bg-surface-raised/30 lg:w-56 lg:border-r lg:border-b-0">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        <ScrollText className="size-4 text-primary" />
        <span className="text-sm font-semibold">Lore</span>
      </div>
      <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-x-visible">
        {LORE_SIDEBAR_LINKS.map((item) => {
          const href = item.href ? `${basePath}/${item.href}` : basePath
          const isActive =
            item.href === ""
              ? pathname === basePath
              : item.href === "graph"
                ? pathname === `${basePath}/graph`
                : item.href === "browse"
                  ? pathname === `${basePath}/browse` ||
                    pathname.startsWith(`${basePath}/browse/`)
                  : item.href === "collections"
                    ? pathname === `${basePath}/collections` ||
                      pathname.startsWith(`${basePath}/collections/`)
                  : item.href === "search"
                    ? pathname === `${basePath}/search`
                    : pathname === href || pathname.startsWith(`${href}/`)

          return (
            <Link
              key={item.title}
              href={href}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              {item.title}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
