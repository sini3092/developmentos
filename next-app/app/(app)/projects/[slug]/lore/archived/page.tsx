import { LoreBrowse } from "@/components/lore/lore-browse"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getFilteredLoreEntries } from "@/lib/auth/lore-context"
import { requireProject } from "@/lib/auth/project-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type LoreArchivedPageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoreArchivedPage({ params }: LoreArchivedPageProps) {
  const { slug } = await params
  const workspaceContext = await requireWorkspaceContext()
  const { project, canManage, currentMembership } = await requireProject(slug)
  const entries = await getFilteredLoreEntries(project.id, {
    canonStatuses: ["archived"],
    excludeArchived: false,
  })

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout slug={slug} canManage={canManage} title="Archived">
      <LoreBrowse
        slug={slug}
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        entries={entries}
        title="Archived lore"
        description="Retired entries no longer part of active development."
        initialCanon="archived"
        canEdit={canEdit}
      />
    </LoreProjectLayout>
  )
}
