import { LoreGraphView } from "@/components/knowledge/lore-graph-view"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
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
    <LoreProjectLayout
      slug={slug}
      canManage={canManage}
      title="Lore graph"
      description={`Relationship map for ${project.name}`}
    >
      <LoreGraphView slug={slug} graph={graph} />
    </LoreProjectLayout>
  )
}
