import { LoreEntryReader } from "@/components/lore/lore-entry-reader"
import { LoreProjectLayout } from "@/components/lore/lore-project-layout"
import { getProjectBoardLists } from "@/lib/auth/board-context"
import {
  getLoreComments,
  getPendingLoreReview,
} from "@/lib/auth/lore-collaboration-context"
import {
  getLoreDevelopmentConnections,
  getLoreDevelopmentOptions,
} from "@/lib/auth/lore-development-context"
import { getLoreEras } from "@/lib/auth/lore-world-context"
import {
  getLoreBacklinks,
  getLoreContentBacklinks,
  getLoreLinkTargets,
  getFilteredLoreEntries,
} from "@/lib/auth/lore-context"
import { LORE_GEOGRAPHIC_TYPES } from "@/lib/constants/lore-world"
import { requireProject } from "@/lib/auth/project-context"
import { createClient } from "@/lib/supabase/server"
import {
  getLoreEntriesForLinking,
  requireLoreEntry,
} from "@/lib/auth/knowledge-context"

async function getReplacementEntry(replacementEntryId: string | null) {
  if (!replacementEntryId) {
    return null
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from("lore_entries")
    .select("id, name, slug")
    .eq("id", replacementEntryId)
    .maybeSingle()

  return data
}

type LoreEntryPageProps = {
  params: Promise<{ slug: string; entrySlug: string }>
}

export default async function LoreEntryPage({ params }: LoreEntryPageProps) {
  const { slug, entrySlug } = await params
  const { project, canManage, members, currentMembership } = await requireProject(slug)
  const entry = await requireLoreEntry(project.id, entrySlug)
  const [otherEntries, backlinks, contentBacklinks, linkTargets, comments, pendingReview, replacementEntry, devConnections, devOptions, boardLists, eras, geoEntries] =
    await Promise.all([
      getLoreEntriesForLinking(project.id, entry.id),
      getLoreBacklinks(project.id, entry.id),
      getLoreContentBacklinks(project.id, entry.id),
      getLoreLinkTargets(project.id),
      getLoreComments(entry.id),
      getPendingLoreReview(entry.id),
      getReplacementEntry(entry.replacement_entry_id),
      getLoreDevelopmentConnections(entry.id),
      getLoreDevelopmentOptions(project.id),
      getProjectBoardLists(project.id),
      getLoreEras(project.id),
      getFilteredLoreEntries(project.id, {
        types: [...LORE_GEOGRAPHIC_TYPES],
        excludeArchived: true,
      }),
    ])

  const parentOptions = geoEntries
    .filter((item) => item.id !== entry.id)
    .map((item) => ({ id: item.id, name: item.name }))

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  const memberProfiles = members.map((member) => ({ profile: member.profile }))

  return (
    <LoreProjectLayout slug={slug} canManage={canManage} showPageHeader={false}>
      <LoreEntryReader
        entry={entry}
        slug={slug}
        backlinks={backlinks}
        contentBacklinks={contentBacklinks}
        linkTargets={linkTargets}
        comments={comments}
        pendingReview={pendingReview}
        members={memberProfiles}
        otherEntries={otherEntries}
        replacementEntry={replacementEntry}
        devConnections={devConnections}
        devOptions={devOptions}
        boardLists={boardLists}
        projectId={project.id}
        eras={eras}
        parentOptions={parentOptions}
        canEdit={canEdit}
        canReview={canManage}
      />
    </LoreProjectLayout>
  )
}
