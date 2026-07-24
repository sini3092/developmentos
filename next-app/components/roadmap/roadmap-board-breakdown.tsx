import Link from "next/link"
import { BookOpen, Layers } from "lucide-react"

import { ProgressBar } from "@/components/roadmap/progress-bar"
import { RoadmapStatusPipeline } from "@/components/roadmap/roadmap-status-pipeline"
import type { ProjectRoadmapView } from "@/lib/auth/project-roadmap-context"

type RoadmapBoardBreakdownProps = {
  slug: string
  view: Pick<ProjectRoadmapView, "boardBreakdown" | "systemsListBreakdown" | "loreHealth">
}

export function RoadmapBoardBreakdown({ slug, view }: RoadmapBoardBreakdownProps) {
  const devBoard = view.boardBreakdown.find((bucket) => bucket.boardKey === "dev")
  const systemsBoard = view.boardBreakdown.find((bucket) => bucket.boardKey === "systems")

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="space-y-3 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Game boards</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Dev sprint work vs Game Systems categories from GAME_STATUS.md
            </p>
          </div>
          <Link href={`/projects/${slug}/tasks/board`} className="text-xs text-info hover:underline">
            Open board
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {devBoard ? (
            <article className="rounded-lg border border-border/50 bg-surface-raised/40 p-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Game Development
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {devBoard.averageProgress}%
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {devBoard.doneTasks}/{devBoard.totalTasks} done
                </span>
              </p>
              <ProgressBar value={devBoard.averageProgress} className="mt-2 h-1.5" />
            </article>
          ) : null}

          {systemsBoard ? (
            <article className="rounded-lg border border-border/50 bg-surface-raised/40 p-3">
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Game Systems
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {systemsBoard.averageProgress}%
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {systemsBoard.doneTasks}/{systemsBoard.totalTasks} done
                </span>
              </p>
              <ProgressBar value={systemsBoard.averageProgress} className="mt-2 h-1.5" />
            </article>
          ) : null}
        </div>

        {view.systemsListBreakdown.length > 0 ? (
          <div className="pt-1">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Systems by category</p>
            <RoadmapStatusPipeline
              listBreakdown={view.systemsListBreakdown}
              totalTasks={systemsBoard?.totalTasks ?? 0}
            />
          </div>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-border/60 bg-card p-4 shadow-xs">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="size-4 text-primary" />
              <h2 className="text-sm font-semibold">Lore library</h2>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Canon entries — Souls enriches thin stubs after GAME_STATUS pushes
            </p>
          </div>
          <Link href={`/projects/${slug}/lore/browse`} className="text-xs text-info hover:underline">
            Browse lore
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-lg border border-border/50 bg-surface-raised/40 p-3">
            <p className="text-xs text-muted-foreground">Total entries</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{view.loreHealth.totalEntries}</p>
          </article>
          <article className="rounded-lg border border-border/50 bg-surface-raised/40 p-3">
            <p className="text-xs text-muted-foreground">Enriched</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-success">
              {view.loreHealth.enrichedEntries}
            </p>
          </article>
          <article className="rounded-lg border border-border/50 bg-surface-raised/40 p-3">
            <p className="text-xs text-muted-foreground">Needs content</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">
              {view.loreHealth.stubEntries}
            </p>
          </article>
        </div>

        {view.loreHealth.stubEntries > 0 ? (
          <p className="text-xs text-muted-foreground">
            {view.loreHealth.stubEntries} entr
            {view.loreHealth.stubEntries === 1 ? "y" : "ies"} still have placeholder or thin content.
            Souls will enrich them in rounds on the next GAME_STATUS push, or you can ask Souls in Lore.
          </p>
        ) : view.loreHealth.totalEntries > 0 ? (
          <p className="text-xs text-muted-foreground">All lore entries have substantive content.</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            Import the Everwood plan or ask Souls to seed lore entries.
          </p>
        )}
      </section>
    </div>
  )
}
