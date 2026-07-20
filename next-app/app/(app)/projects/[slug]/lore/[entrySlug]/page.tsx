import { ScrollText } from "lucide-react"

import { LoreEntryEditor, LoreEntryHeader } from "@/components/knowledge/lore-entry-editor"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { requireProject } from "@/lib/auth/project-context"
import { requireLoreEntry, getLoreEntriesForLinking } from "@/lib/auth/knowledge-context"

type LoreEntryPageProps = {
  params: Promise<{ slug: string; entrySlug: string }>
}

export default async function LoreEntryPage({ params }: LoreEntryPageProps) {
  const { slug, entrySlug } = await params
  const { project, canManage, currentMembership } = await requireProject(slug)
  const entry = await requireLoreEntry(project.id, entrySlug)
  const otherEntries = await getLoreEntriesForLinking(project.id, entry.id)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={entry.name}
        description={entry.summary ?? "Lore entry"}
        icon={ScrollText}
      >
        <LoreEntryHeader slug={slug} />
      </PageHeader>
      <ProjectNav slug={slug} canManage={canManage} />
      <LoreEntryEditor entry={entry} slug={slug} otherEntries={otherEntries} canEdit={canEdit} />
    </div>
  )
}
