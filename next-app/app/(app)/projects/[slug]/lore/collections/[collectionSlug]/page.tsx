import { notFound } from "next/navigation"

import { LoreCollectionDetail } from "@/components/lore/lore-collection-detail"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import {
  getCollectionEntryOptions,
  getLoreCollectionDetail,
} from "@/lib/auth/lore-world-context"
import { requireProject } from "@/lib/auth/project-context"

type LoreCollectionPageProps = {
  params: Promise<{ slug: string; collectionSlug: string }>
}

export default async function LoreCollectionPage({ params }: LoreCollectionPageProps) {
  const { slug, collectionSlug } = await params
  const { project, canManage, currentMembership } = await requireProject(slug)
  const collection = await getLoreCollectionDetail(project.id, collectionSlug)

  if (!collection) {
    notFound()
  }

  const availableEntries = await getCollectionEntryOptions(project.id, collection.id)

  const canEdit =
    canManage || (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout slug={slug} canManage={canManage} showPageHeader={false}>
      <LoreCollectionDetail
        slug={slug}
        collection={collection}
        availableEntries={availableEntries}
        canEdit={canEdit}
      />
    </LoreProjectLayout>
  )
}
