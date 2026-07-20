import { Network } from "lucide-react"

import { LoreGraphView } from "@/components/knowledge/lore-graph-view"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { requireProject } from "@/lib/auth/project-context"
import { getLoreGraph } from "@/lib/auth/knowledge-context"

type LoreGraphPageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoreGraphPage({ params }: LoreGraphPageProps) {
  const { slug } = await params
  const { project, canManage } = await requireProject(slug)
  const graph = await getLoreGraph(project.id)

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Lore graph"
        description={`Relationship map for ${project.name}`}
        icon={Network}
      />
      <ProjectNav slug={slug} canManage={canManage} />
      <LoreGraphView slug={slug} graph={graph} />
    </div>
  )
}
