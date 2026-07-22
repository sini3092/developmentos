import { LoreHome } from "@/components/lore/lore-home"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getLoreOverview } from "@/lib/auth/lore-context"
import { getLoreHealthReport } from "@/lib/auth/lore-world-context"
import { requireProject } from "@/lib/auth/project-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type LorePageProps = {
  params: Promise<{ slug: string }>
}

export default async function LorePage({ params }: LorePageProps) {
  const { slug } = await params
  const workspaceContext = await requireWorkspaceContext()
  const { project, canManage, currentMembership } = await requireProject(slug)
  const overview = await getLoreOverview(project.id)
  const health = await getLoreHealthReport(project.id)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout
      slug={slug}
      canManage={canManage}
      description={`World bible for ${project.name}`}
    >
      <LoreHome
        slug={slug}
        projectName={project.name}
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        overview={overview}
        health={health}
        canEdit={canEdit}
      />
    </LoreProjectLayout>
  )
}
