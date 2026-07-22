import { LoreBrowse } from "@/components/lore/lore-browse"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { searchLoreEntries } from "@/lib/auth/lore-context"
import { requireProject } from "@/lib/auth/project-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

type LoreSearchPageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ q?: string }>
}

export default async function LoreSearchPage({ params, searchParams }: LoreSearchPageProps) {
  const { slug } = await params
  const query = await searchParams
  const workspaceContext = await requireWorkspaceContext()
  const { project, canManage, currentMembership } = await requireProject(slug)
  const entries = await searchLoreEntries(project.id, query.q ?? "")

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout slug={slug} canManage={canManage} title="Search Lore">
      <LoreBrowse
        slug={slug}
        workspaceId={workspaceContext.activeWorkspace!.id}
        projectId={project.id}
        entries={entries}
        title="Search lore"
        description="Find characters, places, factions, and story entries across this project."
        initialSearch={query.q ?? ""}
        canEdit={canEdit}
      />
    </LoreProjectLayout>
  )
}
