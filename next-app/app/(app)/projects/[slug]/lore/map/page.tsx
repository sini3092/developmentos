import { LoreWorldMapView } from "@/components/lore/lore-world-map-view"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getLoreWorldMaps, getMapMarkerEntryOptions } from "@/lib/auth/lore-world-context"
import { requireProject } from "@/lib/auth/project-context"

type LoreMapPageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoreMapPage({ params }: LoreMapPageProps) {
  const { slug } = await params
  const { project, canManage, currentMembership } = await requireProject(slug)
  const [maps, entryOptions] = await Promise.all([
    getLoreWorldMaps(project.id),
    getMapMarkerEntryOptions(project.id),
  ])

  const canEdit =
    canManage || (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout
      slug={slug}
      canManage={canManage}
      title="World map"
      description="Map markers linked to lore"
      showPageHeader={false}
    >
      <LoreWorldMapView
        slug={slug}
        projectId={project.id}
        maps={maps}
        entryOptions={entryOptions}
        canEdit={canEdit}
      />
    </LoreProjectLayout>
  )
}
