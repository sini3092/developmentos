import { Box } from "lucide-react"

import { AssetLibrary } from "@/components/assets/asset-library"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { getAssets } from "@/lib/auth/assets-context"
import { requireProject } from "@/lib/auth/project-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type AssetsPageProps = {
  params: Promise<{ slug: string }>
}

export default async function AssetsPage({ params }: AssetsPageProps) {
  const { slug } = await params
  const workspaceContext = await requireWorkspaceContext()
  const { project, canManage, currentMembership, members } = await requireProject(slug)
  const assets = await getAssets(project.id)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Assets"
        description={`Production asset metadata for ${project.name}`}
        icon={Box}
      />
      <ProjectNav slug={slug} canManage={canManage} />
      <AssetLibrary
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        slug={slug}
        assets={assets}
        members={members}
        canEdit={canEdit}
      />
    </div>
  )
}
