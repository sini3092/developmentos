import { LoreGeographyTree } from "@/components/lore/lore-geography-tree"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getLoreGeographyTree } from "@/lib/auth/lore-world-context"
import { requireProject } from "@/lib/auth/project-context"

type LoreWorldPageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoreWorldPage({ params }: LoreWorldPageProps) {
  const { slug } = await params
  const { project, canManage } = await requireProject(slug)
  const roots = await getLoreGeographyTree(project.id)

  return (
    <LoreProjectLayout
      slug={slug}
      canManage={canManage}
      title="World geography"
      description="Regions, settlements, and locations"
      showPageHeader={false}
    >
      <div className="flex flex-1 flex-col gap-6 p-6">
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Geographic hierarchy</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Navigate the world through parent locations and located-in relationships.
          </p>
        </div>
        <LoreGeographyTree slug={slug} roots={roots} />
      </div>
    </LoreProjectLayout>
  )
}
