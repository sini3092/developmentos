import { Box } from "lucide-react"

import { AssetDetailEditor, AssetDetailHeader } from "@/components/assets/asset-detail-editor"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { requireAsset } from "@/lib/auth/assets-context"
import { getProjectTasksForLinking } from "@/lib/auth/decisions-context"
import { requireProject } from "@/lib/auth/project-context"

type AssetDetailPageProps = {
  params: Promise<{ slug: string; assetSlug: string }>
}

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const { slug, assetSlug } = await params
  const { project, canManage, currentMembership, members } = await requireProject(slug)
  const asset = await requireAsset(project.id, assetSlug)
  const projectTasks = await getProjectTasksForLinking(project.id)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title={asset.name} description={asset.description ?? "Asset"} icon={Box}>
        <AssetDetailHeader slug={slug} />
      </PageHeader>
      <ProjectNav slug={slug} canManage={canManage} />
      <AssetDetailEditor
        asset={asset}
        slug={slug}
        members={members}
        projectTasks={projectTasks}
        canEdit={canEdit}
      />
    </div>
  )
}
