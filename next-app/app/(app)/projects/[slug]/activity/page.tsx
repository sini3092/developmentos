import { Activity, BarChart3 } from "lucide-react"

import { ActivityTimeline } from "@/components/analytics/activity-timeline"
import { BarChart } from "@/components/analytics/bar-chart"
import { PageHeader, StatCard } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { getProjectAnalytics } from "@/lib/auth/analytics-context"
import { requireProject } from "@/lib/auth/project-context"

type ActivityPageProps = {
  params: Promise<{ slug: string }>
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  const { slug } = await params
  const { project, canManage } = await requireProject(slug)
  const analytics = await getProjectAnalytics(project.id)

  const { stats } = analytics

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Activity & Analytics"
        description={`Progress, workload, and audit trail for ${project.name}`}
        icon={Activity}
      />

      <ProjectNav slug={slug} canManage={canManage} />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Completion"
            value={`${stats.completionRate}%`}
            hint={`${stats.doneTasks} of ${stats.totalTasks} tasks done`}
            tone="success"
          />
          <StatCard
            label="Open work"
            value={String(stats.openTasks)}
            hint={`${stats.blockedTasks} blocked · ${stats.overdueTasks} overdue`}
            tone={stats.blockedTasks > 0 ? "warning" : "info"}
          />
          <StatCard
            label="Roadmap"
            value={String(stats.activeInitiatives)}
            hint={`${stats.atRiskInitiatives} at risk · ${stats.activeMilestones} active milestones`}
            tone={stats.atRiskInitiatives > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Knowledge"
            value={String(stats.designDocs + stats.loreEntries)}
            hint={`${stats.designDocs} design docs · ${stats.loreEntries} lore entries`}
            tone="lore"
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          <BarChart title="Tasks by status" items={analytics.tasksByStatus} />
          <BarChart
            title="Tasks by discipline"
            items={analytics.tasksByDiscipline}
            emptyMessage="Assign disciplines on tasks to see workload breakdown."
          />
          <BarChart
            title="Initiative health"
            items={analytics.initiativesByHealth}
            emptyMessage="Create initiatives on the roadmap to track health."
          />
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Activity timeline</h2>
          </div>
          <ActivityTimeline events={analytics.activity} />
        </section>
      </div>
    </div>
  )
}
