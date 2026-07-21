import Link from "next/link"
import { AlertTriangle, CheckCircle2, CircleDashed, ListTodo, Target } from "lucide-react"

import type { RoadmapBoardStats } from "@/lib/utils/roadmap"
import { ProgressBar } from "@/components/roadmap/progress-bar"

type RoadmapOverviewProps = {
  stats: RoadmapBoardStats
  slug: string
}

export function RoadmapOverview({ stats, slug }: RoadmapOverviewProps) {
  const completionRate =
    stats.totalTasks > 0 ? Math.round((stats.doneTasks / stats.totalTasks) * 100) : 0

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Overall progress
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.averageProgress}%</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="size-5" />
          </div>
        </div>
        <ProgressBar value={stats.averageProgress} className="mt-3 h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {stats.initiativesWithWork} initiative{stats.initiativesWithWork === 1 ? "" : "s"} with
          linked work
        </p>
      </article>

      <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Tasks completed
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {stats.doneTasks}
              <span className="text-base font-normal text-muted-foreground">
                /{stats.totalTasks || 0}
              </span>
            </p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
            <CheckCircle2 className="size-5" />
          </div>
        </div>
        <ProgressBar value={completionRate} className="mt-3 h-2" />
        <p className="mt-2 text-xs text-muted-foreground">
          {stats.openTasks} remaining · {completionRate}% done
        </p>
      </article>

      <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Blocked
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.blockedTasks}</p>
          </div>
          <div
            className={`flex size-10 items-center justify-center rounded-lg ${
              stats.blockedTasks > 0
                ? "bg-danger/10 text-danger"
                : "bg-muted text-muted-foreground"
            }`}
          >
            <AlertTriangle className="size-5" />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {stats.blockedTasks > 0
            ? "Blocked tasks affect initiative health automatically."
            : "No blocked tasks on linked work."}
        </p>
      </article>

      <article className="rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Unlinked tasks
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.unlinkedTasks}</p>
          </div>
          <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <ListTodo className="size-5" />
          </div>
        </div>
        {stats.unlinkedTasks > 0 ? (
          <Link
            href={`/projects/${slug}/tasks/board`}
            className="mt-3 inline-flex items-center gap-1 text-xs text-info hover:underline"
          >
            <CircleDashed className="size-3.5" />
            Link tasks from the board
          </Link>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">All active tasks are on the roadmap.</p>
        )}
      </article>
    </section>
  )
}
