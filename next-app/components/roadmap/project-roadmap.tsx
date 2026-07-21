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
            Every task in the project, grouped by status. Updates live from the board and checklists.
          </p>
        </div>
        <RoadmapStatusPipeline breakdown={view.breakdown} totalTasks={view.totalTasks} />
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Active now</h2>
              <p className="text-sm text-muted-foreground">Ready, in progress, and in review</p>
            </div>
            <Link href={`/projects/${slug}/tasks/board`} className="text-sm text-info hover:underline">
              Board
            </Link>
          </div>
          <RoadmapTaskList
            tasks={view.activeWork}
            slug={slug}
            emptyMessage="No active work right now. Move tasks to Ready or In Progress on the board."
          />
        </section>

        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Recently shipped</h2>
            <p className="text-sm text-muted-foreground">Completed tasks, newest first</p>
          </div>
          <RoadmapTaskList
            tasks={view.recentlyCompleted}
            slug={slug}
            emptyMessage="Nothing completed yet. Finish tasks on the board to see them here."
          />
        </section>
      </div>

      {view.blockedWork.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-danger">Blocked</h2>
          <RoadmapTaskList
            tasks={view.blockedWork}
            slug={slug}
            emptyMessage="No blocked tasks."
          />
        </section>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-semibold">Up next</h2>
          <p className="text-sm text-muted-foreground">Backlog and other open work waiting to start</p>
        </div>
        <RoadmapTaskList
          tasks={view.remainingWork}
          slug={slug}
          emptyMessage="No backlog items. Everything is either active or done."
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
