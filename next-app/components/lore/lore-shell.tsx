import type { ReactNode } from "react"

import { LoreSidebar } from "@/components/lore/lore-sidebar"

type LoreShellProps = {
  slug: string
  children: ReactNode
}

export function LoreShell({ slug, children }: LoreShellProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <LoreSidebar slug={slug} />
      <div className="min-h-0 min-w-0 flex-1">{children}</div>
    </div>
  )
}
