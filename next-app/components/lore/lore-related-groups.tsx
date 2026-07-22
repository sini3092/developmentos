import Link from "next/link"

import type { ResolvedLoreRelationship } from "@/lib/database.types"
import type { LoreContentBacklink } from "@/lib/auth/lore-context"
import { LORE_RELATIONSHIP_LABELS } from "@/lib/constants/lore-relationships"

type LoreRelatedGroupsProps = {
  slug: string
  relationships: ResolvedLoreRelationship[]
  contentBacklinks: LoreContentBacklink[]
}

export function LoreRelatedGroups({
  slug,
  relationships,
  contentBacklinks,
}: LoreRelatedGroupsProps) {
  const grouped = new Map<string, ResolvedLoreRelationship[]>()

  for (const relationship of relationships) {
    const key = relationship.relationship_type
    const list = grouped.get(key) ?? []
    list.push(relationship)
    grouped.set(key, list)
  }

  const hasRelationships = relationships.length > 0
  const hasContentBacklinks = contentBacklinks.length > 0

  if (!hasRelationships && !hasContentBacklinks) {
    return null
  }

  return (
    <div className="mt-8 space-y-8 border-t border-border/60 pt-8">
      {hasRelationships ? (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([type, items]) => (
            <section key={type} className="space-y-3">
              <h2 className="text-sm font-medium">{LORE_RELATIONSHIP_LABELS[type as keyof typeof LORE_RELATIONSHIP_LABELS] ?? type}</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {items.map((relationship) => (
                  <Link
                    key={relationship.id}
                    href={`/projects/${slug}/lore/${relationship.target_slug}`}
                    className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:border-info/40 hover:bg-info/5"
                  >
                    <p className="font-medium">{relationship.target_name}</p>
                    {relationship.label ? (
                      <p className="mt-1 text-sm text-muted-foreground">{relationship.label}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : null}

      {hasContentBacklinks ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Linked from content</h2>
          <p className="text-xs text-muted-foreground">
            Other entries that mention this one with [[wiki links]].
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {contentBacklinks.map((backlink) => (
              <Link
                key={backlink.id}
                href={`/projects/${slug}/lore/${backlink.slug}`}
                className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-muted/30"
              >
                <p className="font-medium">{backlink.name}</p>
                {backlink.summary ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{backlink.summary}</p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
