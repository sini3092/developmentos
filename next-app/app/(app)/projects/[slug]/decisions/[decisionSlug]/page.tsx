import { Gavel } from "lucide-react"

import { DecisionDetailEditor, DecisionDetailHeader } from "@/components/decisions/decision-detail-editor"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { getProjectTasksForLinking, requireDecision } from "@/lib/auth/decisions-context"
import { requireProject } from "@/lib/auth/project-context"

type DecisionDetailPageProps = {
  params: Promise<{ slug: string; decisionSlug: string }>
}

export default async function DecisionDetailPage({ params }: DecisionDetailPageProps) {
  const { slug, decisionSlug } = await params
  const { project, canManage, currentMembership, members } = await requireProject(slug)
  const decision = await requireDecision(project.id, slug, decisionSlug)
  const projectTasks = await getProjectTasksForLinking(project.id)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title={decision.title} description="Decision record" icon={Gavel}>
        <DecisionDetailHeader slug={slug} />
      </PageHeader>
      <ProjectNav slug={slug} canManage={canManage} />
      <DecisionDetailEditor
        decision={decision}
        slug={slug}
        members={members}
        projectTasks={projectTasks}
        canEdit={canEdit}
      />
    </div>
  )
}
