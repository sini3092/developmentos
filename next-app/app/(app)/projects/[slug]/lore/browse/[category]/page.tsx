import { notFound } from "next/navigation"

import { LoreBrowse } from "@/components/lore/lore-browse"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getFilteredLoreEntries } from "@/lib/auth/lore-context"
import { LORE_CATEGORY_BY_HREF } from "@/lib/constants/lore-navigation"
import { requireProject } from "@/lib/auth/project-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type LoreCategoryBrowsePageProps = {
  params: Promise<{ slug: string; category: string }>
}

export default async function LoreCategoryBrowsePage({ params }: LoreCategoryBrowsePageProps) {
  const { slug, category } = await params
  const loreCategory = LORE_CATEGORY_BY_HREF[category]

  if (!loreCategory) {
    notFound()
  }

  const workspaceContext = await requireWorkspaceContext()
  const { project, canManage, currentMembership } = await requireProject(slug)
  const entries = await getFilteredLoreEntries(project.id, {
    types: loreCategory.types,
    excludeArchived: true,
  })

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout slug={slug} canManage={canManage} title={loreCategory.label}>
      <LoreBrowse
        slug={slug}
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        entries={entries}
        title={loreCategory.label}
        description={loreCategory.description}
        categoryHref={category}
        canEdit={canEdit}
      />
    </LoreProjectLayout>
  )
}
