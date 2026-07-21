import { Suspense } from "react"

import { ListTodo } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { TaskBoardPageClient } from "@/components/tasks/task-board-page-client"
import { getProjectBoardLists } from "@/lib/auth/board-context"
import { getProjectTasks } from "@/lib/auth/task-context"
import { requireProject } from "@/lib/auth/project-context"
import { parseTaskListFilters } from "@/lib/utils/task-filters"

type BoardPageProps = {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function TasksBoardPage({ params, searchParams }: BoardPageProps) {
  const { slug } = await params
  const query = await searchParams
  const { project, members, canManage, currentMembership } = await requireProject(slug)

  const canEdit =
    canManage || (currentMembership !== null && currentMembership.role !== "viewer")

  const initialFilters = parseTaskListFilters(query)
  const [tasks, lists] = await Promise.all([
    getProjectTasks(project.id),
    getProjectBoardLists(project.id),
  ])

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Tasks"
        description={`Task board for ${project.name} · organize work in custom lists`}
        icon={ListTodo}
      />

      <ProjectNav slug={slug} canManage={canManage} />

      <Suspense fallback={null}>
        <TaskBoardPageClient
          slug={slug}
          projectId={project.id}
          lists={lists}
          initialTasks={tasks}
          initialFilters={initialFilters}
          members={members}
          milestones={[]}
          repoOwner={project.github_owner}
          repoName={project.github_repo_name}
          canEdit={canEdit}
          projectLabels={[]}
        />
      </Suspense>
    </div>
  )
}
