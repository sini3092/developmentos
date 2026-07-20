import { ScrollText } from "lucide-react"

import { LoreLibrary } from "@/components/knowledge/lore-library"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { requireProject } from "@/lib/auth/project-context"
import { getLoreEntries } from "@/lib/auth/knowledge-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type LorePageProps = {
  params: Promise<{ slug: string }>
}

export default async function LorePage({ params }: LorePageProps) {
  const { slug } = await params
  const workspaceContext = await requireWorkspaceContext()
  const { project, canManage, currentMembership } = await requireProject(slug)
  const entries = await getLoreEntries(project.id)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Lore"
        description={`World bible for ${project.name}`}
        icon={ScrollText}
      />
      <ProjectNav slug={slug} canManage={canManage} />
      <LoreLibrary
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        slug={slug}
        entries={entries}
        canEdit={canEdit}
      />
    </div>
  )
}
