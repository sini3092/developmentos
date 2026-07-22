import type { ReactNode } from "react"
import { ScrollText } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"

type LoreProjectLayoutProps = {
  slug: string
  canManage: boolean
  title?: string
  description?: string
  showPageHeader?: boolean
  children: ReactNode
}

export function LoreProjectLayout({
  slug,
  canManage,
  title = "Lore",
  description,
  showPageHeader = true,
  children,
}: LoreProjectLayoutProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {showPageHeader ? (
        <PageHeader title={title} description={description} icon={ScrollText} />
      ) : null}
      <ProjectNav slug={slug} canManage={canManage} />
      {children}
    </div>
  )
}
