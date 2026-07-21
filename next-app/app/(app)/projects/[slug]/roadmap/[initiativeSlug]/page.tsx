import Link from "next/link"
import { ArrowLeft, BarChart3 } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { HealthBadge } from "@/components/roadmap/health-badge"
import { InitiativeLinkedTasks } from "@/components/roadmap/initiative-linked-tasks"
import { PostInitiativeUpdateForm } from "@/components/roadmap/post-initiative-update-form"
import { ProgressBar } from "@/components/roadmap/progress-bar"
import { TaskStatusBreakdown } from "@/components/roadmap/task-status-breakdown"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { requireProject } from "@/lib/auth/project-context"
import { requireInitiative } from "@/lib/auth/roadmap-context"
import {
  INITIATIVE_HEALTH_LABELS,
  INITIATIVE_PRIORITY_LABELS,
  INITIATIVE_STATUS_LABELS,
  MILESTONE_STATUS_LABELS,
} from "@/lib/constants/roadmap"
import { deriveDisplayHealth } from "@/lib/utils/roadmap"
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

  const displayHealth = deriveDisplayHealth(
    initiative.health,
    initiative.task_status_breakdown,
    initiative.task_count
  )

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={initiative.name}
        description={initiative.summary ?? "Task-driven initiative progress and linked work."}
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
              <h2 className="font-medium">Live progress</h2>
              <HealthBadge health={displayHealth} />
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Progress</p>
                <p className="text-3xl font-semibold tabular-nums">{initiative.progress}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tasks done</p>
                <p className="text-3xl font-semibold tabular-nums">
                  {initiative.task_done_count ?? 0}
                  <span className="text-base font-normal text-muted-foreground">
                    /{initiative.task_count}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Remaining</p>
                <p className="text-3xl font-semibold tabular-nums">
                  {initiative.task_open_count ?? 0}
                </p>
              </div>
            </div>
            <ProgressBar value={initiative.progress} className="mt-4 h-2" />
            {initiative.task_status_breakdown ? (
              <div className="mt-4">
                <TaskStatusBreakdown breakdown={initiative.task_status_breakdown} />
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">{INITIATIVE_STATUS_LABELS[initiative.status]}</Badge>
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
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-medium">Linked tasks</h2>
              <Link
                href={`/projects/${slug}/tasks/board`}
                className="text-sm text-info hover:underline"
              >
                Open board
              </Link>
            </div>
            <InitiativeLinkedTasks tasks={initiative.linked_tasks} slug={slug} />
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
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span className="tabular-nums">{milestone.progress}%</span>
                    </div>
                    <ProgressBar value={milestone.progress} className="h-1.5" />
                  </div>
                  {milestone.target_date ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Target {formatDate(milestone.target_date)}
                    </p>
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}

          {initiative.updates.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-medium">Status updates</h2>
              {initiative.updates.map((update) => (
                <article
                  key={update.id}
                  className="rounded-xl border border-border/60 bg-card p-4 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{update.summary}</p>
                    <Badge variant="outline" className="font-normal">
                      {INITIATIVE_HEALTH_LABELS[update.health]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDate(update.created_at)} · {update.progress}%
                  </p>
                  {update.accomplishments ? (
                    <p className="mt-2 text-sm text-muted-foreground">{update.accomplishments}</p>
                  ) : null}
                </article>
              ))}
            </section>
          ) : null}
        </div>

        {canEdit ? (
          <aside className="space-y-4">
            <section className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
              <h2 className="font-medium">Post update</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Progress syncs from tasks automatically. Use this for a formal note to the team.
              </p>
              <div className="mt-4">
                <PostInitiativeUpdateForm
                  initiativeId={initiative.id}
                  slug={slug}
                  initiativeSlug={initiative.slug}
                  currentHealth={initiative.health}
                  currentProgress={initiative.progress}
                />
              </div>
            </section>
          </aside>
        ) : null}
      </div>
    </div>
  )
}
