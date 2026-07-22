import { LoreTimelineView } from "@/components/lore/lore-timeline-view"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getLoreEras, getLoreTimeline } from "@/lib/auth/lore-world-context"
import { requireProject } from "@/lib/auth/project-context"

type LoreTimelinePageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoreTimelinePage({ params }: LoreTimelinePageProps) {
  const { slug } = await params
  const { project, canManage, currentMembership } = await requireProject(slug)
  const [events, eras] = await Promise.all([
    getLoreTimeline(project.id),
    getLoreEras(project.id),
  ])

  const canEdit =
    canManage || (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout
      slug={slug}
      canManage={canManage}
      title="Timeline"
      description="Historical events in chronological order"
      showPageHeader={false}
    >
      <LoreTimelineView
        slug={slug}
        projectId={project.id}
        events={events}
        eras={eras}
        canEdit={canEdit}
      />
    </LoreProjectLayout>
  )
}
