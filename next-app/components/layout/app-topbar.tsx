"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { useUiStore } from "@/lib/stores/ui-store"
import { getInitials } from "@/lib/utils/format"

function buildBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) {
    return [{ label: "Home", href: "/" }]
  }

  return segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`
    const label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")

    return { label, href }
  })
}

export function AppTopbar() {
  const pathname = usePathname()
  const setCommandPaletteOpen = useUiStore((state) => state.setCommandPaletteOpen)
  const { members, unreadNotificationCount } = useWorkspace()
  const breadcrumbs = buildBreadcrumbs(pathname)
  const visibleMembers = members.slice(0, 4)

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border/60 bg-background/80 px-4 backdrop-blur-sm">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />

      <Breadcrumb className="hidden min-w-0 flex-1 md:flex">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1

            return (
              <span key={crumb.href} className="contents">
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast ? (
                  <BreadcrumbSeparator>
                    <ChevronRight className="size-3.5" />
                  </BreadcrumbSeparator>
                ) : null}
              </span>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="hidden h-8 w-52 justify-start gap-2 text-muted-foreground md:flex"
          onClick={() => setCommandPaletteOpen(true)}
        >
          <Search className="size-3.5" />
          <span className="text-xs">Search or command...</span>
          <kbd className="ml-auto rounded border border-border bg-muted px-1.5 font-mono text-[10px]">
            Ctrl K
          </kbd>
        </Button>

        <Button size="sm" className="gap-1.5" asChild>
          <Link href="/projects">
            <Plus className="size-3.5" />
            <span className="hidden sm:inline">Projects</span>
          </Link>
        </Button>

        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          asChild
        >
          <Link href="/inbox" aria-label="Notifications">
            <Bell className="size-4" />
            {unreadNotificationCount > 0 ? (
              <span className="absolute top-1 right-1 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-medium text-white">
                {unreadNotificationCount > 9 ? "9+" : unreadNotificationCount}
              </span>
            ) : null}
          </Link>
        </Button>

        {visibleMembers.length > 0 ? (
          <div className="hidden items-center gap-2 rounded-lg border border-border/60 bg-surface-raised px-2 py-1 lg:flex">
            <div className="flex -space-x-1.5">
              {visibleMembers.map((member) => (
                <Avatar key={member.user_id} className="size-6 border-2 border-background">
                  {member.profile?.avatar_url ? (
                    <AvatarImage src={member.profile.avatar_url} alt="" />
                  ) : null}
                  <AvatarFallback className="bg-secondary text-[9px]">
                    {getInitials(member.profile?.display_name)}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <Badge variant="secondary" className="text-[10px]">
              {members.length} member{members.length === 1 ? "" : "s"}
            </Badge>
          </div>
        ) : null}
      </div>
    </header>
  )
}
