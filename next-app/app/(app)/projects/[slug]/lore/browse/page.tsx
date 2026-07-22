import { LoreBrowse } from "@/components/lore/lore-browse"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getFilteredLoreEntries } from "@/lib/auth/lore-context"
import { requireProject } from "@/lib/auth/project-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type LoreBrowsePageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoreBrowsePage({ params }: LoreBrowsePageProps) {
  const { slug } = await params
  const workspaceContext = await requireWorkspaceContext()
  const { project, canManage, currentMembership } = await requireProject(slug)
  const entries = await getFilteredLoreEntries(project.id, { excludeArchived: true })

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout slug={slug} canManage={canManage} title="Browse Lore">
      <LoreBrowse
        slug={slug}
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        entries={entries}
        title="Browse all lore"
        description="Filter by type, canon status, or search across the world bible."
        canEdit={canEdit}
      />
    </LoreProjectLayout>
  )
}
