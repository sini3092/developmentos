import Link from "next/link"
import { ArrowLeft, BarChart3 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { HealthBadge } from "@/components/roadmap/health-badge"
import { ProgressBar } from "@/components/roadmap/progress-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { requireProject } from "@/lib/auth/project-context"
import { requireInitiative } from "@/lib/auth/roadmap-context"
import {
  INITIATIVE_PRIORITY_LABELS,
  INITIATIVE_STATUS_LABELS,
  MILESTONE_STATUS_LABELS,
  PLANNING_HORIZON_LABELS,
} from "@/lib/constants/roadmap"
import { formatDate } from "@/lib/utils/format"

type InitiativePageProps = {
  params: Promise<{ slug: string; initiativeSlug: string }>
}

export default async function InitiativePage({ params }: InitiativePageProps) {
  const { slug, initiativeSlug } = await params
  const { project, canManage, currentMembership } = await requireProject(slug)
  const initiative = await requireInitiative(project.id, initiativeSlug)

  const canEdit =
    canManage ||
    (currentMembership !== null && currentMembership.role !== "viewer")

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={initiative.name}
        description={initiative.summary ?? "Initiative detail and formal updates."}
        icon={BarChart3}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={`/projects/${slug}/roadmap`}>
            <ArrowLeft className="size-4" />
            Back to roadmap
          </Link>
        </Button>
      </PageHeader>

      <ProjectNav slug={slug} canManage={canManage} />

      <div className="grid flex-1 gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border/60 bg-card p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-medium">Overview</h2>
              <HealthBadge health={initiative.health} />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Progress</span>
                <span className="tabular-nums text-foreground">{initiative.progress}%</span>
              </div>
              <ProgressBar value={initiative.progress} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">{INITIATIVE_STATUS_LABELS[initiative.status]}</Badge>
              <Badge variant="outline">{PLANNING_HORIZON_LABELS[initiative.planning_horizon]}</Badge>
              <Badge variant="outline">
                {INITIATIVE_PRIORITY_LABELS[initiative.priority]}
              </Badge>
              {initiative.target_start ? (
                <span className="text-xs text-muted-foreground">
                  Start {formatDate(initiative.target_start)}
                </span>
              ) : null}
              {initiative.target_completion ? (
                <span className="text-xs text-muted-foreground">
                  Target {formatDate(initiative.target_completion)}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
              <span>{initiative.milestone_count} milestones</span>
              <span>{initiative.task_count} linked tasks</span>
            </div>
          </section>

          {initiative.milestones.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-medium">Milestones</h2>
              {initiative.milestones.map((milestone) => (
                <article
                  key={milestone.id}
                  className="rounded-xl border border-border/60 bg-card p-4 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-medium">{milestone.name}</h3>
                    <Badge variant="secondary">{MILESTONE_STATUS_LABELS[milestone.status]}</Badge>
                  </div>
                  {milestone.target_date ? (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Target {formatDate(milestone.target_date)}
                    </p>
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="font-medium">Activity</h2>
            <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-6 text-sm text-muted-foreground">
              Progress and status update automatically when you complete tasks and checklist items.
              Link tasks to this initiative from the kanban board.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
