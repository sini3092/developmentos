import { Activity, AlertTriangle, BarChart3, CalendarDays, Target } from "lucide-react"

import { BarChart } from "@/components/analytics/bar-chart"
import { ActivityFeed } from "@/components/dashboard/activity-feed"
import { RoadmapSnapshot } from "@/components/dashboard/roadmap-snapshot"
import { TaskListPanel } from "@/components/dashboard/task-list-panel"
import {
  PageHeader,
  StatCard,
} from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { getWorkspaceAnalytics } from "@/lib/auth/analytics-context"
import { getDashboardData } from "@/lib/auth/dashboard-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

export default async function HomePage() {
  const { activeWorkspace, user } = await requireWorkspaceContext()
  const [dashboard, analytics] = await Promise.all([
    getDashboardData(activeWorkspace!.id, user.id),
    getWorkspaceAnalytics(activeWorkspace!.id),
  ])

  const { stats } = dashboard
  const { stats: workspaceStats } = analytics

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Home"
        description="What needs attention, what changed, and where the project stands."
        icon={Activity}
      />

      <div className="flex flex-1 flex-col gap-6 p-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Avg progress"
            value={`${stats.averageProgress}%`}
            hint={`${stats.activeInitiatives} active initiative${stats.activeInitiatives === 1 ? "" : "s"}`}
            tone={stats.averageProgress >= 50 ? "success" : "default"}
          />
          <StatCard
            label="Completed this week"
            value={String(stats.tasksDoneThisWeek)}
            hint={`${stats.tasksDueThisWeek} due this week`}
            tone="info"
          />
          <StatCard
            label="Blocked"
            value={String(stats.blockedCount)}
            hint="Across workspace"
            tone={stats.blockedCount > 0 ? "danger" : "default"}
          />
          <StatCard
            label="Overdue"
            value={String(stats.overdueCount)}
            hint="Past due date"
            tone={stats.overdueCount > 0 ? "warning" : "default"}
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Workspace overview</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Completion"
              value={`${workspaceStats.completionRate}%`}
              hint={`${workspaceStats.doneTasks} of ${workspaceStats.totalTasks} at 100% checklist`}
              tone="success"
            />
            <StatCard
              label="Open work"
              value={String(workspaceStats.openTasks)}
              hint={`${workspaceStats.blockedTasks} blocked · ${workspaceStats.overdueTasks} overdue`}
              tone={workspaceStats.blockedTasks > 0 ? "warning" : "info"}
            />
            <StatCard
              label="Roadmap"
              value={String(workspaceStats.activeInitiatives)}
              hint={`${workspaceStats.atRiskInitiatives} at risk · ${workspaceStats.activeMilestones} active milestones`}
              tone={workspaceStats.atRiskInitiatives > 0 ? "warning" : "default"}
            />
            <StatCard
              label="Knowledge"
              value={String(workspaceStats.designDocs + workspaceStats.loreEntries)}
              hint={`${workspaceStats.designDocs} design docs · ${workspaceStats.loreEntries} lore entries`}
              tone="lore"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <BarChart title="Tasks by progress" items={analytics.tasksByProgress} />
            <BarChart
              title="Tasks by project"
              items={analytics.tasksByProject}
              emptyMessage="Create projects and tasks to see workload distribution."
            />
            <BarChart
              title="Initiative health"
              items={analytics.initiativesByHealth}
              emptyMessage="Create initiatives on project roadmaps to track health."
            />
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-3">
          <section className="space-y-4 xl:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <Target className="size-4 text-info" />
                My Focus
              </h2>
              <Badge variant="secondary">{dashboard.focusTasks.length} tasks</Badge>
            </div>
            <TaskListPanel
              tasks={dashboard.focusTasks}
              emptyMessage="No assigned tasks in your queue. Open My Work when tasks are assigned to you."
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="size-4 text-warning" />
                Blocker Radar
              </h2>
            </div>
            <TaskListPanel
              tasks={dashboard.blockedTasks}
              emptyMessage="No blocked tasks right now."
            />
          </section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <Activity className="size-4 text-muted-foreground" />
              Team Activity
            </h2>
            <ActivityFeed events={dashboard.activity} projectSlugs={dashboard.projectSlugs} />
          </section>

          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-medium">
              <CalendarDays className="size-4 text-muted-foreground" />
              Roadmap Snapshot
            </h2>
            <RoadmapSnapshot initiatives={dashboard.roadmap} />
          </section>
        </div>
      </div>
    </div>
  )
}
