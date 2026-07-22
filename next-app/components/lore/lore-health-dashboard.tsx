"use client"

import Link from "next/link"
import type { ReactNode } from "react"
import { AlertTriangle, Link2Off, MessageSquare, Users } from "lucide-react"

import type { LoreHealthReport } from "@/lib/auth/lore-world-context"
import { LoreCanonBadge } from "@/components/lore/lore-badges"

type LoreHealthDashboardProps = {
  slug: string
  report: LoreHealthReport
  compact?: boolean
}

function HealthStat({
  label,
  value,
  href,
}: {
  label: string
  value: number
  href?: string
}) {
  const content = (
    <>
      <p className="text-xs text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </>
  )

  if (href && value > 0) {
    return (
      <Link
        href={href}
        className="rounded-xl border border-border/60 bg-card p-4 shadow-xs transition-colors hover:bg-muted/30"
      >
        {content}
      </Link>
    )
  }

  return <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">{content}</article>
}

export function LoreHealthDashboard({ slug, report, compact = false }: LoreHealthDashboardProps) {
  const healthPath = `/projects/${slug}/lore/health`

  return (
    <div className={compact ? "space-y-4" : "flex flex-1 flex-col gap-6 p-6"}>
      {!compact ? (
        <div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Lore health</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Gaps and issues across your world bible.
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Lore health</h3>
          <Link href={healthPath} className="text-xs text-info hover:underline">
            View all
          </Link>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HealthStat
          label="Awaiting review"
          value={report.totals.awaitingReview}
          href={`/projects/${slug}/lore/review`}
        />
        <HealthStat label="Missing summary" value={report.totals.missingSummary} href={healthPath} />
        <HealthStat
          label="No relationships"
          value={report.totals.withoutRelationships}
          href={healthPath}
        />
        <HealthStat
          label="Open comments"
          value={report.totals.unresolvedComments}
          href={healthPath}
        />
        <HealthStat label="Broken links" value={report.totals.brokenLinks} href={healthPath} />
        <HealthStat
          label="Timeline undated"
          value={report.totals.timelineWithoutDates}
          href={`/projects/${slug}/lore/timeline`}
        />
        <HealthStat label="Canon changed (7d)" value={report.totals.recentlyChangedCanon} href={healthPath} />
      </div>

      {!compact ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <IssueList
            title="Broken internal links"
            icon={Link2Off}
            empty="No broken wiki links detected."
            items={report.brokenLinks.map((item) => ({
              key: item.entryId,
              href: `/projects/${slug}/lore/${item.entrySlug}`,
              label: item.entryName,
              meta: item.brokenSlugs.join(", "),
            }))}
          />
          <IssueList
            title="Unresolved comments"
            icon={MessageSquare}
            empty="No open lore comments."
            items={report.unresolvedComments.map((item) => ({
              key: item.entryId,
              href: `/projects/${slug}/lore/${item.entrySlug}`,
              label: item.entryName,
              meta: `${item.count} open`,
            }))}
          />
          <IssueList
            title="Isolated entries"
            icon={Users}
            empty="All entries have at least one relationship."
            items={report.withoutRelationships.map((item) => ({
              key: item.id,
              href: `/projects/${slug}/lore/${item.slug}`,
              label: item.name,
              meta: item.entry_type.replace(/_/g, " "),
            }))}
          />
          <IssueList
            title="Recently changed canon"
            icon={AlertTriangle}
            empty="No canon entries changed in the last week."
            items={report.recentlyChangedCanon.map((item) => ({
              key: item.id,
              href: `/projects/${slug}/lore/${item.slug}`,
              label: item.name,
              meta: <LoreCanonBadge status={item.canon_status} />,
            }))}
          />
        </div>
      ) : null}
    </div>
  )
}

function IssueList({
  title,
  icon: Icon,
  empty,
  items,
}: {
  title: string
  icon: typeof Link2Off
  empty: string
  items: Array<{ key: string; href: string; label: string; meta: ReactNode }>
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <Icon className="size-4" />
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <li key={item.key}>
              <Link href={item.href} className="text-sm font-medium hover:text-info">
                {item.label}
              </Link>
              <div className="text-xs text-muted-foreground">{item.meta}</div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
