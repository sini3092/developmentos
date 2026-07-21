import Link from "next/link"
import {
  CheckCircle2,
  GitBranch,
  ListTodo,
  MessageSquare,
  PlayCircle,
  Target,
} from "lucide-react"

import { InitiativeCard } from "@/components/roadmap/initiative-card"
import { ProgressBar } from "@/components/roadmap/progress-bar"
import { RoadmapStatusPipeline } from "@/components/roadmap/roadmap-status-pipeline"
import { RoadmapTaskList } from "@/components/roadmap/roadmap-task-list"
import { Button } from "@/components/ui/button"
import type { ProjectRoadmapView } from "@/lib/auth/project-roadmap-context"

type ProjectOverviewProps = {
  slug: string
  view: ProjectRoadmapView
  memberCount: number
}

export function ProjectOverview({ slug, view, memberCount }: ProjectOverviewProps) {
  const notStarted = Math.max(0, view.totalTasks - view.doneTasks - view.inProgressTasks)

  return (
    <div className="flex flex-1 flex-col gap-8">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Avg progress
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{view.averageProgress}%</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Target className="size-5" />
            </div>
          </div>
          <ProgressBar value={view.averageProgress} className="mt-3 h-2" />
        </article>

        <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Complete
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {view.doneTasks}
                <span className="text-base font-normal text-muted-foreground">/{view.totalTasks}</span>
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{view.completionRate}% at 100%</p>
        </article>

        <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                In progress
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{view.inProgressTasks}</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-info/10 text-info">
              <PlayCircle className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Checklist started</p>
        </article>

        <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Not started
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{notStarted}</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <ListTodo className="size-5" />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">0% checklist progress</p>
        </article>

        <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Team
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{memberCount}</p>
            </div>
          </div>
          <Link href={`/projects/${slug}/channels`} className="mt-3 inline-flex text-xs text-info hover:underline">
            Open chat
          </Link>
        </article>

        <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                GitHub
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{view.githubEvents.length}</p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <GitBranch className="size-5" />
            </div>
          </div>
          <Link href={`/projects/${slug}/github`} className="mt-3 inline-flex text-xs text-info hover:underline">
            View history
          </Link>
        </article>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button asChild>
          <Link href={`/projects/${slug}/tasks/board`}>Open task board</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/projects/${slug}/roadmap`}>Full roadmap</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/projects/${slug}/channels`}>
            <MessageSquare className="mr-2 size-4" />
            Team chat
          </Link>
        </Button>
      </div>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Board lists</h2>
          <p className="text-sm text-muted-foreground">
            Where work lives on the task board — progress syncs from checklists
          </p>
        </div>
        <RoadmapStatusPipeline listBreakdown={view.listBreakdown} totalTasks={view.totalTasks} />
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">In progress</h2>
              <p className="text-sm text-muted-foreground">Tasks with checklist work underway</p>
            </div>
            <Link href={`/projects/${slug}/tasks/board`} className="text-sm text-info hover:underline">
              Board
            </Link>
          </div>
          <RoadmapTaskList
            tasks={view.activeWork}
            slug={slug}
            emptyMessage="No tasks in progress yet."
          />
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Recently completed</h2>
            <p className="text-sm text-muted-foreground">Tasks that reached 100% progress</p>
          </div>
          <RoadmapTaskList
            tasks={view.recentlyCompleted}
            slug={slug}
            emptyMessage="Nothing completed yet."
          />
        </section>
      </div>

      {view.initiatives.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Work areas</h2>
              <p className="text-sm text-muted-foreground">
                Progress rolls up automatically from linked tasks
              </p>
            </div>
            <Link href={`/projects/${slug}/roadmap`} className="text-sm text-info hover:underline">
              See all
            </Link>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {view.initiatives.slice(0, 4).map((initiative) => (
              <InitiativeCard key={initiative.id} initiative={initiative} slug={slug} />
            ))}
          </div>
        </section>
      ) : null}

      {view.totalTasks === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-10 text-center">
          <h2 className="text-sm font-medium">Get started</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create lists and tasks on the board. Progress, roadmap, and this overview update
            automatically from checklists.
          </p>
          <Button asChild className="mt-4">
            <Link href={`/projects/${slug}/tasks/board`}>Go to task board</Link>
          </Button>
        </div>
      ) : null}
    </div>
  )
}
