"use client"

import Link from "next/link"
import { useState } from "react"
import { Plus } from "lucide-react"

import type { Initiative, MilestoneWithOwner, ProjectMemberWithProfile } from "@/lib/database.types"
import { MILESTONE_STATUS_LABELS } from "@/lib/constants/roadmap"
import { CreateMilestoneForm } from "@/components/roadmap/create-milestone-form"
import { HealthBadge } from "@/components/roadmap/health-badge"
import { ProgressBar } from "@/components/roadmap/progress-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { formatDate } from "@/lib/utils/format"

type MilestonesListProps = {
  workspaceId: string
  projectId: string
  slug: string
  milestones: MilestoneWithOwner[]
  initiatives: Pick<Initiative, "id" | "name">[]
  members: ProjectMemberWithProfile[]
  canEdit: boolean
}

export function MilestonesList({
  workspaceId,
  projectId,
  slug,
  milestones,
  initiatives,
  members,
  canEdit,
}: MilestonesListProps) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {milestones.length} milestone{milestones.length === 1 ? "" : "s"}
        </p>
        {canEdit ? (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="size-4" />
                New milestone
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create milestone</DialogTitle>
              </DialogHeader>
              <CreateMilestoneForm
                workspaceId={workspaceId}
                projectId={projectId}
                slug={slug}
                initiatives={initiatives}
                members={members}
                onSuccess={() => setCreateOpen(false)}
              />
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      {milestones.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-10 text-center">
          <h2 className="text-sm font-medium">No milestones yet</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Milestones mark major delivery points and can link to initiatives.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {milestones.map((milestone) => (
            <article
              key={milestone.id}
              className="rounded-xl border border-border/60 bg-card p-4 shadow-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-medium">{milestone.name}</h3>
                  {milestone.description ? (
                    <p className="text-sm text-muted-foreground">{milestone.description}</p>
                  ) : null}
                </div>
                <HealthBadge health={milestone.health} />
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className="tabular-nums">{milestone.progress}%</span>
                </div>
                <ProgressBar value={milestone.progress} />
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{MILESTONE_STATUS_LABELS[milestone.status]}</Badge>
                {milestone.initiative ? (
                  <Link
                    href={`/projects/${slug}/roadmap/${milestone.initiative.slug}`}
                    className="text-xs text-info hover:underline"
                  >
                    {milestone.initiative.name}
                  </Link>
                ) : null}
                {milestone.target_date ? (
                  <span className="text-xs text-muted-foreground">
                    Due {formatDate(milestone.target_date)}
                  </span>
                ) : null}
                {milestone.task_count > 0 ? (
                  <span className="text-xs text-muted-foreground">
                    {milestone.task_count} linked task{milestone.task_count === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
