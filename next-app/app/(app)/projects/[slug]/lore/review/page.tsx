import { LoreBrowse } from "@/components/lore/lore-browse"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getFilteredLoreEntries } from "@/lib/auth/lore-context"
import { requireProject } from "@/lib/auth/project-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type LoreReviewPageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoreReviewPage({ params }: LoreReviewPageProps) {
  const { slug } = await params
  const workspaceContext = await requireWorkspaceContext()
  const { project, canManage, currentMembership } = await requireProject(slug)
  const entries = await getFilteredLoreEntries(project.id, {
    canonStatuses: ["review"],
    excludeArchived: true,
  })

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout slug={slug} canManage={canManage} title="Review Queue">
      <LoreBrowse
        slug={slug}
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        entries={entries}
        title="Review queue"
        description="Entries awaiting feedback or canon approval."
        initialCanon="review"
        canEdit={canEdit}
      />
    </LoreProjectLayout>
  )
}
