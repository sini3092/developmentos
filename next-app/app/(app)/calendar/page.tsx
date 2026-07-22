import { Suspense } from "react"
import { Calendar } from "lucide-react"

import { CalendarView } from "@/components/calendar/calendar-view"
import { PageHeader } from "@/components/layout/page-header"
import { getAllWorkspaceProjects, getCalendarData } from "@/lib/auth/calendar-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"
import { parseMonthParam } from "@/lib/utils/calendar"

type CalendarPageProps = {
  searchParams: Promise<{ month?: string; project?: string }>
}

export default async function CalendarPage({ searchParams }: CalendarPageProps) {
  const query = await searchParams
  const { activeWorkspace, user } = await requireWorkspaceContext()
  const { year, month } = parseMonthParam(query.month)

  const [calendar, projects] = await Promise.all([
    getCalendarData(activeWorkspace!.id, user.id, year, month, query.project),
    getAllWorkspaceProjects(activeWorkspace!.id),
  ])

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Calendar"
        description="Tasks, milestones, and your personal reminders across the workspace."
        icon={Calendar}
      />
      <Suspense fallback={null}>
        <CalendarView
          workspaceId={activeWorkspace!.id}
          year={year}
          month={month}
          events={calendar.events}
          projects={projects}
        />
      </Suspense>
    </div>
  )
}
