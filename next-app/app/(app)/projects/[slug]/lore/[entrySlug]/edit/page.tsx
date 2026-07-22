import { LoreEntryEditor, LoreEntryHeader } from "@/components/knowledge/lore-entry-editor"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getPendingLoreReview } from "@/lib/auth/lore-collaboration-context"
import { requireProject } from "@/lib/auth/project-context"
import { getLoreEntriesForLinking, requireLoreEntry } from "@/lib/auth/knowledge-context"

type LoreEntryEditPageProps = {
  params: Promise<{ slug: string; entrySlug: string }>
}

export default async function LoreEntryEditPage({ params }: LoreEntryEditPageProps) {
  const { slug, entrySlug } = await params
  const { project, canManage, members, currentMembership } = await requireProject(slug)
  const entry = await requireLoreEntry(project.id, entrySlug)
  const [otherEntries, pendingReview] = await Promise.all([
    getLoreEntriesForLinking(project.id, entry.id),
    getPendingLoreReview(entry.id),
  ])

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  if (!canEdit) {
    return (
      <LoreProjectLayout slug={slug} canManage={canManage} title={entry.name}>
        <p className="p-6 text-sm text-muted-foreground">You do not have permission to edit lore.</p>
      </LoreProjectLayout>
    )
  }

  const memberProfiles = members.map((member) => ({ profile: member.profile }))

  return (
    <LoreProjectLayout slug={slug} canManage={canManage} title={`Edit ${entry.name}`}>
      <div className="border-b border-border/60 px-6 py-2">
        <LoreEntryHeader slug={slug} entrySlug={entry.slug} />
      </div>
      <LoreEntryEditor
        entry={entry}
        slug={slug}
        otherEntries={otherEntries}
        members={memberProfiles}
        pendingReview={pendingReview}
        canEdit
        canReview={canManage}
      />
    </LoreProjectLayout>
  )
}
