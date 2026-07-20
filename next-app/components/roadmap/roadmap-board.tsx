"use client"

import { useState } from "react"
import { Plus, Sparkles } from "lucide-react"

import { seedStarterInitiatives } from "@/lib/actions/roadmap"
import type { InitiativeWithOwner, ProjectMemberWithProfile } from "@/lib/database.types"
import {
  PLANNING_HORIZONS,
  PLANNING_HORIZON_LABELS,
} from "@/lib/constants/roadmap"
import { CreateInitiativeForm } from "@/components/roadmap/create-initiative-form"
import { InitiativeCard } from "@/components/roadmap/initiative-card"
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
}

export function RoadmapBoard({
  workspaceId,
  projectId,
  slug,
  initiatives,
  members,
  canEdit,
}: RoadmapBoardProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [seeding, setSeeding] = useState(false)

  async function handleSeed() {
    setSeeding(true)
    await seedStarterInitiatives(projectId, slug)
    setSeeding(false)
  }

  const grouped = PLANNING_HORIZONS.map((horizon) => ({
    horizon,
    items: initiatives.filter((initiative) => initiative.planning_horizon === horizon),
  }))

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Progress updates automatically from linked tasks and checklists.
        </p>
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
            Create initiatives to plan work across Now, Next, and Later horizons.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          {grouped.map(({ horizon, items }) => (
            <section key={horizon} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-wide uppercase">
                  {PLANNING_HORIZON_LABELS[horizon]}
                </h2>
                <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {items.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
                    Nothing in {PLANNING_HORIZON_LABELS[horizon].toLowerCase()}
                  </div>
                ) : (
                  items.map((initiative) => (
                    <InitiativeCard key={initiative.id} initiative={initiative} slug={slug} />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
