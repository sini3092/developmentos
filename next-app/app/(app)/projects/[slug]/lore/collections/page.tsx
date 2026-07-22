import { LoreCollectionsList } from "@/components/lore/lore-collections-list"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getLoreCollections } from "@/lib/auth/lore-world-context"
import { requireProject } from "@/lib/auth/project-context"

type LoreCollectionsPageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoreCollectionsPage({ params }: LoreCollectionsPageProps) {
  const { slug } = await params
  const { project, canManage, currentMembership } = await requireProject(slug)
  const collections = await getLoreCollections(project.id)

  const canEdit =
    canManage || (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout
      slug={slug}
      canManage={canManage}
      title="Collections"
      description="Curated lore groups"
      showPageHeader={false}
    >
      <LoreCollectionsList
        slug={slug}
        projectId={project.id}
        collections={collections}
        canEdit={canEdit}
      />
    </LoreProjectLayout>
  )
}
