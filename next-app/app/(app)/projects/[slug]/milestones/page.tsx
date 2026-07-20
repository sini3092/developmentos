import Link from "next/link"
import { Milestone } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { MilestonesList } from "@/components/roadmap/milestones-list"
import { requireProject } from "@/lib/auth/project-context"
import { getProjectInitiatives, getProjectMilestones } from "@/lib/auth/roadmap-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type MilestonesPageProps = {
  params: Promise<{ slug: string }>
}

export default async function MilestonesPage({ params }: MilestonesPageProps) {
  const { slug } = await params
  const workspaceContext = await requireWorkspaceContext()
  const { project, members, canManage, currentMembership } = await requireProject(slug)
  const [milestones, initiatives] = await Promise.all([
    getProjectMilestones(project.id),
    getProjectInitiatives(project.id),
  ])

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Milestones"
        description={`Delivery checkpoints for ${project.name}`}
        icon={Milestone}
      >
        <Link
          href={`/projects/${slug}/roadmap`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to roadmap
        </Link>
      </PageHeader>

      <ProjectNav slug={slug} canManage={canManage} />

      <MilestonesList
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        slug={slug}
        milestones={milestones}
        initiatives={initiatives.map((initiative) => ({
          id: initiative.id,
          name: initiative.name,
        }))}
        members={members}
        canEdit={canEdit}
      />
    </div>
  )
}
