import { Suspense } from "react"

import { ListTodo } from "lucide-react"



import { PageHeader } from "@/components/layout/page-header"

import { ProjectNav } from "@/components/projects/project-nav"

import { KanbanBoard } from "@/components/tasks/kanban-board"

import { TaskDetailSheet } from "@/components/tasks/task-detail-sheet"

import { getProjectTasks, getTaskDetail } from "@/lib/auth/task-context"
import { getProjectInitiatives, getProjectMilestones } from "@/lib/auth/roadmap-context"

import { requireProject } from "@/lib/auth/project-context"

import { parseTaskListFilters } from "@/lib/utils/task-filters"



type BoardPageProps = {

  params: Promise<{ slug: string }>

  searchParams: Promise<Record<string, string | undefined>>

}



export default async function TasksBoardPage({ params, searchParams }: BoardPageProps) {

  const { slug } = await params

  const query = await searchParams

  const { project, members, canManage, currentMembership } =

    await requireProject(slug)



  const canEdit =

    canManage ||

    (currentMembership !== null && currentMembership.role !== "viewer")



  const filters = parseTaskListFilters(query)

  const tasks = await getProjectTasks(project.id, filters)

  const [initiatives, milestones] = await Promise.all([
    getProjectInitiatives(project.id),
    getProjectMilestones(project.id),
  ])

  const selectedTask = query.task ? await getTaskDetail(query.task, slug) : null



  return (

    <div className="flex min-h-0 flex-1 flex-col">

      <PageHeader

        title="Tasks"

        description={`Kanban board for ${project.name} · prefix ${project.task_prefix}`}

        icon={ListTodo}

      />



      <ProjectNav slug={slug} canManage={canManage} />



      <KanbanBoard

        slug={slug}

        projectId={project.id}

        tasks={tasks}

        members={members}

        projectLabels={[]}

        milestones={milestones.map((item) => ({ id: item.id, name: item.name }))}

        canEdit={canEdit}

      />



      <Suspense fallback={null}>

        <TaskDetailSheet
          task={selectedTask}
          slug={slug}
          members={members}
          initiatives={initiatives.map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
          }))}
          milestones={milestones.map((item) => ({
            id: item.id,
            name: item.name,
            slug: item.slug,
            initiative_id: item.initiative_id,
          }))}
          repoOwner={project.github_owner}
          repoName={project.github_repo_name}
          canEdit={canEdit}
        />

      </Suspense>

    </div>

  )

}


