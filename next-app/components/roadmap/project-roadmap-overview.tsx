import Link from "next/link"
import {
  CheckCircle2,
  CircleDashed,
  GitBranch,
  ListTodo,
  PlayCircle,
  Target,
} from "lucide-react"

import type { ProjectRoadmapView } from "@/lib/auth/project-roadmap-context"
import { ProgressBar } from "@/components/roadmap/progress-bar"

type ProjectRoadmapOverviewProps = {
  view: ProjectRoadmapView
  slug: string
}

export function ProjectRoadmapOverview({ view, slug }: ProjectRoadmapOverviewProps) {
  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
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
        <p className="mt-2 text-xs text-muted-foreground">
          Checklist progress across all {view.totalTasks} tasks
        </p>
      </article>

      <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Complete</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {view.doneTasks}
              <span className="text-base font-normal text-muted-foreground">/{view.totalTasks}</span>
            </p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <CheckCircle2 className="size-5" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {view.completionRate}% of tasks at 100% progress
        </p>
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
        <p className="mt-3 text-xs text-muted-foreground">
          Tasks with checklist work started but not finished
        </p>
      </article>

      <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Total tasks
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{view.totalTasks}</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <ListTodo className="size-5" />
          </div>
        </div>
        <Link href={`/projects/${slug}/tasks/board`} className="mt-3 inline-flex text-xs text-info hover:underline">
          Open task board
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
        <p className="mt-3 text-xs text-muted-foreground">
          {view.githubPushCount} push{view.githubPushCount === 1 ? "" : "es"}
          {view.githubPullRequestCount > 0
            ? ` · ${view.githubPullRequestCount} PR${view.githubPullRequestCount === 1 ? "" : "s"}`
            : ""}
        </p>
        <Link href={`/projects/${slug}/github`} className="mt-2 inline-flex text-xs text-info hover:underline">
          GitHub history
        </Link>
      </article>

      <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Ungrouped
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{view.unlinkedTaskCount}</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <CircleDashed className="size-5" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Tasks not assigned to a work area</p>
      </article>
    </section>
  )
}
