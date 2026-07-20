import { BookOpen } from "lucide-react"

import { DesignLibrary } from "@/components/knowledge/design-library"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { requireProject } from "@/lib/auth/project-context"
import { getDesignDocuments } from "@/lib/auth/knowledge-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type DesignPageProps = {
  params: Promise<{ slug: string }>
}

export default async function DesignPage({ params }: DesignPageProps) {
  const { slug } = await params
  const workspaceContext = await requireWorkspaceContext()
  const { project, canManage, currentMembership } = await requireProject(slug)
  const documents = await getDesignDocuments(project.id)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Game Design"
        description={`Design documents for ${project.name}`}
        icon={BookOpen}
      />
      <ProjectNav slug={slug} canManage={canManage} />
      <DesignLibrary
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        slug={slug}
        documents={documents}
        canEdit={canEdit}
      />
    </div>
  )
}
