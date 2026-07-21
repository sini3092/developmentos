import Link from "next/link"
import { BarChart3 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { ProjectRoadmap } from "@/components/roadmap/project-roadmap"
import { requireProject } from "@/lib/auth/project-context"
import { getProjectRoadmapView } from "@/lib/auth/project-roadmap-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type RoadmapPageProps = {
  params: Promise<{ slug: string }>
}

export default async function RoadmapPage({ params }: RoadmapPageProps) {
  const { slug } = await params
  const workspaceContext = await requireWorkspaceContext()
  const { project, members, canManage, currentMembership } = await requireProject(slug)
  const view = await getProjectRoadmapView(project.id)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Roadmap"
        description={`Live project overview for ${project.name} — tasks, GitHub pushes, and what remains`}
        icon={BarChart3}
      >
        <Link
          href={`/projects/${slug}/tasks/board`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Open task board →
        </Link>
      </PageHeader>

      <ProjectNav slug={slug} canManage={canManage} />

      <ProjectRoadmap
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        slug={slug}
        view={view}
        members={members}
        canEdit={canEdit}
      />
    </div>
  )
}
