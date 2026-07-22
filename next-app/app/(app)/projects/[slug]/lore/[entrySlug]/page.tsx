import { LoreEntryReader } from "@/components/lore/lore-entry-reader"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getLoreBacklinks } from "@/lib/auth/lore-context"
import { requireProject } from "@/lib/auth/project-context"
import {
  getLoreEntriesForLinking,
  requireLoreEntry,
} from "@/lib/auth/knowledge-context"

type LoreEntryPageProps = {
  params: Promise<{ slug: string; entrySlug: string }>
}

export default async function LoreEntryPage({ params }: LoreEntryPageProps) {
  const { slug, entrySlug } = await params
  const { project, canManage, currentMembership } = await requireProject(slug)
  const entry = await requireLoreEntry(project.id, entrySlug)
  const [otherEntries, backlinks] = await Promise.all([
    getLoreEntriesForLinking(project.id, entry.id),
    getLoreBacklinks(project.id, entry.id),
  ])

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <LoreProjectLayout slug={slug} canManage={canManage} showPageHeader={false}>
      <LoreEntryReader
        entry={entry}
        slug={slug}
        backlinks={backlinks}
        otherEntries={otherEntries}
        canEdit={canEdit}
      />
    </LoreProjectLayout>
  )
}
