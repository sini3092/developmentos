import { LoreHealthDashboard } from "@/components/lore/lore-health-dashboard"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getLoreHealthReport } from "@/lib/auth/lore-world-context"
import { requireProject } from "@/lib/auth/project-context"

type LoreHealthPageProps = {
  params: Promise<{ slug: string }>
}

export default async function LoreHealthPage({ params }: LoreHealthPageProps) {
  const { slug } = await params
  const { project, canManage } = await requireProject(slug)
  const report = await getLoreHealthReport(project.id)

  return (
    <LoreProjectLayout
      slug={slug}
      canManage={canManage}
      title="Lore health"
      description="Project lore quality overview"
      showPageHeader={false}
    >
      <LoreHealthDashboard slug={slug} report={report} />
    </LoreProjectLayout>
  )
}
