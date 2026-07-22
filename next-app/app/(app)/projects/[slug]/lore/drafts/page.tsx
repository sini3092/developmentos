import { LoreBrowse } from "@/components/lore/lore-browse"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getFilteredLoreEntries } from "@/lib/auth/lore-context"
import { requireProject } from "@/lib/auth/project-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type LoreDraftsPageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoreDraftsPage({ params }: LoreDraftsPageProps) {
  const { slug } = await params
  const workspaceContext = await requireWorkspaceContext()
  const { project, canManage, currentMembership } = await requireProject(slug)
  const entries = await getFilteredLoreEntries(project.id, {
    canonStatuses: ["draft", "concept"],
    excludeArchived: true,
  })

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout slug={slug} canManage={canManage} title="Drafts">
      <LoreBrowse
        slug={slug}
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        entries={entries}
        title="Drafts"
        description="Work in progress — concepts and drafts not yet approved as canon."
        initialCanon="draft"
        canEdit={canEdit}
      />
    </LoreProjectLayout>
  )
}
