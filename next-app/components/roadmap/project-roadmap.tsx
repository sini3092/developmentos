"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import type { ProjectRoadmapView } from "@/lib/auth/project-roadmap-context"
import type { ProjectMemberWithProfile } from "@/lib/database.types"
import { CreateInitiativeForm } from "@/components/roadmap/create-initiative-form"
import { InitiativeCard } from "@/components/roadmap/initiative-card"
import { ProjectRoadmapOverview } from "@/components/roadmap/project-roadmap-overview"
import { RoadmapGithubSection, RoadmapProjectActivity } from "@/components/roadmap/roadmap-project-activity"
import { RoadmapStatusPipeline } from "@/components/roadmap/roadmap-status-pipeline"
import { RoadmapTaskList } from "@/components/roadmap/roadmap-task-list"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type ProjectRoadmapProps = {
  workspaceId: string
  projectId: string
  slug: string
  view: ProjectRoadmapView
  members: ProjectMemberWithProfile[]
  canEdit: boolean
}

export function ProjectRoadmap({
  workspaceId,
  projectId,
  slug,
  view,
  members,
  canEdit,
}: ProjectRoadmapProps) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="flex flex-1 flex-col gap-8 p-6">
      <ProjectRoadmapOverview view={view} slug={slug} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold">Recent project activity</h2>
            <p className="text-sm text-muted-foreground">
              Tasks shipped, GitHub pushes, commits, and pull requests in one timeline
            </p>
          </div>
          <Link href={`/projects/${slug}/github`} className="text-sm text-info hover:underline">
            GitHub history
          </Link>
        </div>
        <RoadmapProjectActivity items={view.recentActivity} slug={slug} />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">GitHub shipping</h2>
          <p className="text-sm text-muted-foreground">
            Code pushed to the connected repository — click an event to see commits
          </p>
        </div>
        <RoadmapGithubSection
          items={view.recentActivity}
          slug={slug}
          pushCount={view.githubPushCount}
          pullRequestCount={view.githubPullRequestCount}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Work pipeline</h2>
          <p className="text-sm text-muted-foreground">
            Tasks grouped by board list. Progress comes from checklists on the task board.
          </p>
        </div>
        <RoadmapStatusPipeline listBreakdown={view.listBreakdown} totalTasks={view.totalTasks} />
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">In progress</h2>
              <p className="text-sm text-muted-foreground">Tasks with checklist progress started</p>
            </div>
            <Link href={`/projects/${slug}/tasks/board`} className="text-sm text-info hover:underline">
              Board
            </Link>
          </div>
          <RoadmapTaskList
            tasks={view.activeWork}
            slug={slug}
            emptyMessage="No tasks in progress. Add checklist items or move work on the board."
          />
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Recently completed</h2>
            <p className="text-sm text-muted-foreground">Tasks at 100% progress, newest first</p>
          </div>
          <RoadmapTaskList
            tasks={view.recentlyCompleted}
            slug={slug}
            emptyMessage="Nothing completed yet. Finish checklists on the board to see tasks here."
          />
        </section>
      </div>


      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Not started</h2>
          <p className="text-sm text-muted-foreground">Open tasks with 0% checklist progress</p>
        </div>
        <RoadmapTaskList
          tasks={view.remainingWork}
          slug={slug}
          emptyMessage="No waiting tasks. Everything is either in progress or complete."
        />
      </section>

      {view.initiatives.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">By work area</h2>
              <p className="text-sm text-muted-foreground">
                Optional groupings — progress rolls up from linked tasks automatically
              </p>
            </div>
            {canEdit ? (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="size-4" />
                    Add work area
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Create work area</DialogTitle>
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
            ) : null}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {view.initiatives.map((initiative) => (
              <InitiativeCard key={initiative.id} initiative={initiative} slug={slug} />
            ))}
          </div>
        </section>
      ) : null}

      {view.unlinkedTaskCount > 0 ? (
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Ungrouped tasks</h2>
            <p className="text-sm text-muted-foreground">
              {view.unlinkedTaskCount} task{view.unlinkedTaskCount === 1 ? "" : "s"} not assigned to
              a work area
            </p>
          </div>
          <RoadmapTaskList
            tasks={view.unlinkedTasks}
            slug={slug}
            emptyMessage="All tasks are grouped."
          />
        </section>
      ) : null}

      {view.totalTasks === 0 && view.githubEvents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-10 text-center">
          <h2 className="text-sm font-medium">Roadmap is empty</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Create tasks on the board or connect GitHub. This page shows shipped work, code pushes,
            active tasks, and what remains across the project.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild>
              <Link href={`/projects/${slug}/tasks/board`}>Go to task board</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/projects/${slug}/github`}>GitHub history</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
