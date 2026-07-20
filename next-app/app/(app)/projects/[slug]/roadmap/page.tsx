import Link from "next/link"
import { BarChart3 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { RoadmapBoard } from "@/components/roadmap/roadmap-board"
import { requireProject } from "@/lib/auth/project-context"
import { getProjectInitiatives } from "@/lib/auth/roadmap-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type RoadmapPageProps = {
  params: Promise<{ slug: string }>
}

export default async function RoadmapPage({ params }: RoadmapPageProps) {
  const { slug } = await params
  const workspaceContext = await requireWorkspaceContext()
  const { project, members, canManage, currentMembership } = await requireProject(slug)
  const initiatives = await getProjectInitiatives(project.id)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Roadmap"
        description={`Strategic initiatives for ${project.name}`}
        icon={BarChart3}
      >
        <Link
          href={`/projects/${slug}/milestones`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          View milestones →
        </Link>
      </PageHeader>

      <ProjectNav slug={slug} canManage={canManage} />

      <RoadmapBoard
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        slug={slug}
        initiatives={initiatives}
        members={members}
        canEdit={canEdit}
      />
    </div>
  )
}
