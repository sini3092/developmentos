import { FolderKanban } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { GithubRepoLink } from "@/components/projects/github-repo-link"
import { ProjectNav } from "@/components/projects/project-nav"
import { ProjectOverview } from "@/components/projects/project-overview"
import { Badge } from "@/components/ui/badge"
import { getProjectRoadmapView } from "@/lib/auth/project-roadmap-context"
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
  const view = await getProjectRoadmapView(project.id)
  const colorClass =
    PROJECT_COLOR_CLASSES[project.color as ProjectColor] ?? PROJECT_COLOR_CLASSES.blue

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={project.name}
        description={
          project.description ??
          "Task board, checklist-driven progress, roadmap, and team chat."
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

      <div className="flex flex-1 flex-col p-6">
        <ProjectOverview slug={slug} view={view} memberCount={members.length} />
      </div>
    </div>
  )
}
