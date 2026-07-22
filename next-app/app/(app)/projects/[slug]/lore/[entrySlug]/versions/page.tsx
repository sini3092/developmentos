import { LoreVersionCompareView } from "@/components/lore/lore-version-compare-view"
import { LoreVersionsPanel } from "@/components/lore/lore-versions-panel"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { requireProject } from "@/lib/auth/project-context"
import { requireLoreEntry } from "@/lib/auth/knowledge-context"

type LoreVersionsPageProps = {
  params: Promise<{ slug: string; entrySlug: string }>
  searchParams: Promise<{ from?: string; to?: string }>
}

export default async function LoreVersionsPage({ params, searchParams }: LoreVersionsPageProps) {
  const { slug, entrySlug } = await params
  const query = await searchParams
  const { project, canManage, currentMembership } = await requireProject(slug)
  const entry = await requireLoreEntry(project.id, entrySlug)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout slug={slug} canManage={canManage} title={`Versions — ${entry.name}`}>
      <div className="space-y-6 p-6">
        <div>
          <h2 className="text-lg font-semibold">Version history</h2>
          <p className="text-sm text-muted-foreground">
            Compare snapshots, review change classifications, and restore older canon.
          </p>
        </div>

        <LoreVersionCompareView
          slug={slug}
          entry={entry}
          versions={entry.versions}
          fromVersionId={query.from ?? null}
          toVersionId={query.to ?? null}
        />

        <LoreVersionsPanel
          slug={slug}
          entrySlug={entry.slug}
          entryId={entry.id}
          versions={entry.versions}
          canEdit={canEdit}
        />
      </div>
    </LoreProjectLayout>
  )
}
