import { Gavel } from "lucide-react"

import { DecisionLog } from "@/components/decisions/decision-log"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { getDecisions } from "@/lib/auth/decisions-context"
import { requireProject } from "@/lib/auth/project-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type DecisionsPageProps = {
  params: Promise<{ slug: string }>
}

export default async function DecisionsPage({ params }: DecisionsPageProps) {
  const { slug } = await params
  const workspaceContext = await requireWorkspaceContext()
  const { project, canManage, currentMembership, members } = await requireProject(slug)
  const decisions = await getDecisions(project.id)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Decisions"
        description={`Decision log for ${project.name}`}
        icon={Gavel}
      />
      <ProjectNav slug={slug} canManage={canManage} />
      <DecisionLog
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        slug={slug}
        decisions={decisions}
        members={members}
        canEdit={canEdit}
      />
    </div>
  )
}
