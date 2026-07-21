"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus, Sparkles } from "lucide-react"

import { seedStarterInitiatives } from "@/lib/actions/roadmap"
import type { InitiativeWithOwner, ProjectMemberWithProfile } from "@/lib/database.types"
import {
  PLANNING_HORIZONS,
  PLANNING_HORIZON_LABELS,
} from "@/lib/constants/roadmap"
import { computeBoardStats, computeColumnProgress, getHorizonHeaderClass } from "@/lib/utils/roadmap"
import { CreateInitiativeForm } from "@/components/roadmap/create-initiative-form"
import { InitiativeCard } from "@/components/roadmap/initiative-card"
import { RoadmapOverview } from "@/components/roadmap/roadmap-overview"
import { ProgressBar } from "@/components/roadmap/progress-bar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type RoadmapBoardProps = {
  workspaceId: string
  projectId: string
  slug: string
  initiatives: InitiativeWithOwner[]
  members: ProjectMemberWithProfile[]
  canEdit: boolean
  unlinkedTasks: number
}

export function RoadmapBoard({
  workspaceId,
  projectId,
  slug,
  initiatives,
  members,
  canEdit,
  unlinkedTasks,
}: RoadmapBoardProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)
  const stats = computeBoardStats(initiatives, unlinkedTasks)

  async function handleSeed() {
    setSeeding(true)
    await seedStarterInitiatives(projectId, slug)
    setSeeding(false)
  }

  const grouped = PLANNING_HORIZONS.map((horizon) => ({
    horizon,
    items: initiatives.filter((initiative) => initiative.planning_horizon === horizon),
    progress: computeColumnProgress(
      initiatives.filter((initiative) => initiative.planning_horizon === horizon)
    ),
  }))

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <RoadmapOverview stats={stats} slug={slug} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Planning board</p>
          <p className="text-sm text-muted-foreground">
            Progress, health, and status update automatically from linked tasks and checklists.
          </p>
        </div>
        {canEdit ? (
          <div className="flex flex-wrap items-center gap-2">
            {initiatives.length === 0 ? (
              <Button variant="outline" onClick={handleSeed} disabled={seeding}>
                <Sparkles className="size-4" />
                {seeding ? "Seeding…" : "Seed starters"}
              </Button>
            ) : null}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="size-4" />
                  New initiative
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create initiative</DialogTitle>
                </DialogHeader>
                <CreateInitiativeForm
                  workspaceId={workspaceId}
                  projectId={projectId}
                  slug={slug}
                  members={members}
                  onSuccess={() => setCreateOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        ) : null}
      </div>

      {initiatives.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-10 text-center">
          <h2 className="text-sm font-medium">No initiatives yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create initiatives for Now, Next, and Later. Link tasks from the board to drive progress
            automatically.
          </p>
          {canEdit ? (
            <Button className="mt-4" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" />
              Create first initiative
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          {grouped.map(({ horizon, items, progress }) => (
            <section
              key={horizon}
              className="flex flex-col gap-3 rounded-xl border border-border/50 bg-surface-raised/30 p-3"
            >
              <div className="space-y-2 px-1">
                <div className="flex items-center justify-between gap-2">
                  <h2
                    className={`text-sm font-semibold tracking-wide uppercase ${getHorizonHeaderClass(horizon)}`}
                  >
                    {PLANNING_HORIZON_LABELS[horizon]}
                  </h2>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {items.length} initiative{items.length === 1 ? "" : "s"}
                  </span>
                </div>
                {items.length > 0 ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Column progress</span>
                      <span className="tabular-nums">{progress}%</span>
                    </div>
                    <ProgressBar value={progress} className="h-1.5" />
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col gap-3">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                    Nothing in {PLANNING_HORIZON_LABELS[horizon].toLowerCase()}
                  </div>
                ) : (
                  items.map((initiative) => (
                    <InitiativeCard
                      key={initiative.id}
                      initiative={initiative}
                      slug={slug}
                      canEdit={canEdit}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      {stats.unlinkedTasks > 0 ? (
        <div className="rounded-xl border border-info/30 bg-info/5 px-4 py-3 text-sm">
          <span className="font-medium">{stats.unlinkedTasks} tasks</span> are not linked to any
          initiative yet.{" "}
          <Link href={`/projects/${slug}/tasks/board`} className="text-info hover:underline">
            Open the task board
          </Link>{" "}
          to connect work to the roadmap.
        </div>
      ) : null}
    </div>
  )
}
