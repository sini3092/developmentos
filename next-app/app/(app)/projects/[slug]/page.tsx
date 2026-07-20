import Link from "next/link"
import { FolderKanban } from "lucide-react"

import { PageHeader, StatCard } from "@/components/layout/page-header"
import { GithubRepoLink } from "@/components/projects/github-repo-link"
import { ProjectNav } from "@/components/projects/project-nav"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getProjectTaskStats } from "@/lib/auth/task-context"
import { requireProject } from "@/lib/auth/project-context"
import {
  PROJECT_COLOR_CLASSES,
  PROJECT_VISIBILITY_LABELS,
  type ProjectColor,
} from "@/lib/constants/projects"

type ProjectPageProps = {
  params: Promise<{ slug: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { slug } = await params
  const { project, members, canManage } = await requireProject(slug)
  const stats = await getProjectTaskStats(project.id)
  const colorClass =
    PROJECT_COLOR_CLASSES[project.color as ProjectColor] ?? PROJECT_COLOR_CLASSES.blue

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={project.name}
        description={
          project.description ??
          "Kanban tasks, auto-updating roadmap, and team chat."
        }
        icon={FolderKanban}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={`size-3 rounded-full ${colorClass}`} />
          <Badge variant="secondary">
            {PROJECT_VISIBILITY_LABELS[project.visibility]}
          </Badge>
          <GithubRepoLink project={project} />
        </div>
      </PageHeader>

      <ProjectNav slug={slug} canManage={canManage} />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Members" value={String(members.length)} tone="info" />
          <StatCard
            label="Tasks"
            value={String(stats.total)}
            hint={`${stats.done} done · ${stats.total - stats.done} remaining`}
            tone="success"
          />
          <StatCard
            label="In progress"
            value={String(stats.inProgress)}
            hint={`${stats.blocked} blocked`}
            tone={stats.blocked > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Blocked"
            value={String(stats.blocked)}
            hint={`${stats.inProgress} in progress`}
            tone={stats.blocked > 0 ? "warning" : "default"}
          />
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link href={`/projects/${slug}/tasks/board`}>Open kanban board</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/projects/${slug}/roadmap`}>View roadmap</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/projects/${slug}/channels`}>Team chat</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
