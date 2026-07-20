"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Settings } from "lucide-react"

import { projectSectionNav } from "@/lib/constants/navigation"
import { getNavIcon } from "@/lib/constants/navigation-icons"
import { cn } from "@/lib/utils"

type ProjectNavProps = {
  slug: string
  canManage?: boolean
}

export function ProjectNav({ slug, canManage = false }: ProjectNavProps) {
  const pathname = usePathname()

  return (
    <div className="border-b border-border/60 px-6">
      <nav className="flex gap-1 overflow-x-auto py-2">
        {projectSectionNav.map((section) => {
          const href = `/projects/${slug}/${section.href}`
          const isOverview = section.href === "overview"
          const targetHref = isOverview ? `/projects/${slug}` : href
          const isActive = isOverview
            ? pathname === `/projects/${slug}`
            : section.href === "tasks"
              ? pathname.includes(`/projects/${slug}/tasks`)
              : pathname.startsWith(targetHref)
          const Icon = getNavIcon(section.icon)

          return (
            <Link
              key={section.href}
              href={targetHref}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-3.5" />
              {section.title}
            </Link>
          )
        })}
        {canManage ? (
          <Link
            href={`/projects/${slug}/settings`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
              pathname === `/projects/${slug}/settings`
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Settings className="size-3.5" />
            Settings
          </Link>
        ) : null}
      </nav>
    </div>
  )
}
