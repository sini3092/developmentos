import { LoreBrowse } from "@/components/lore/lore-browse"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { LoreReviewQueue } from "@/components/lore/lore-review-queue"
import { getPendingLoreReviewsForEntries } from "@/lib/auth/lore-collaboration-context"
import { getFilteredLoreEntries } from "@/lib/auth/lore-context"
import { requireProject } from "@/lib/auth/project-context"

type LoreReviewPageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoreReviewPage({ params }: LoreReviewPageProps) {
  const { slug } = await params
  const { project, canManage, currentMembership } = await requireProject(slug)
  const entries = await getFilteredLoreEntries(project.id, {
    canonStatuses: ["review"],
    excludeArchived: true,
  })
  const reviewsByEntryId = await getPendingLoreReviewsForEntries(entries.map((entry) => entry.id))

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout slug={slug} canManage={canManage} title="Review Queue">
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-lg font-semibold">Review queue</h2>
          <p className="text-sm text-muted-foreground">
            Approve lore for canon or send entries back with feedback.
          </p>
        </div>
        <LoreReviewQueue
          slug={slug}
          entries={entries}
          reviewsByEntryId={reviewsByEntryId}
          canReview={canManage}
        />
        <div className="border-t border-border/60 pt-6">
          <LoreBrowse
            slug={slug}
            workspaceId={project.workspace_id}
            projectId={project.id}
            entries={entries}
            title="All in review"
            description="Grid view of entries awaiting approval."
            initialCanon="review"
            canEdit={canEdit}
          />
        </div>
      </div>
    </LoreProjectLayout>
  )
}
