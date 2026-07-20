import type { MilestoneStatus, Project, TaskStatus } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { getMonthRange } from "@/lib/utils/calendar"

export type CalendarEventTone = "default" | "info" | "success" | "warning" | "danger"

export type CalendarEvent = {
  id: string
  type: "task" | "milestone"
  date: string
  title: string
  subtitle: string
  href: string
  projectName: string
  projectColor: string
  tone: CalendarEventTone
}

export type CalendarProjectOption = Pick<Project, "id" | "name" | "slug" | "color">

function taskTone(status: TaskStatus, date: string): CalendarEventTone {
  const today = new Date().toISOString().slice(0, 10)
  if (status === "done") return "success"
  if (status === "blocked") return "danger"
  if (date < today) return "warning"
  if (status === "in_progress" || status === "in_review") return "info"
  return "default"
}

function milestoneTone(status: MilestoneStatus, date: string): CalendarEventTone {
  const today = new Date().toISOString().slice(0, 10)
  if (status === "completed") return "success"
  if (status === "missed" || (date < today && status === "active")) return "warning"
  if (status === "active") return "info"
  return "default"
}

export async function getCalendarData(
  workspaceId: string,
  year: number,
  month: number,
  projectSlug?: string
) {
  const supabase = await createClient()
  const { start, end } = getMonthRange(year, month)

  let projectQuery = supabase
    .from("projects")
    .select("id, name, slug, color")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .order("name")

  if (projectSlug) {
    projectQuery = projectQuery.eq("slug", projectSlug)
  }

  const { data: projects } = await projectQuery
  const projectList = (projects ?? []) as CalendarProjectOption[]
  const projectIds = projectList.map((project) => project.id)
  const projectById = new Map(projectList.map((project) => [project.id, project]))

  if (projectIds.length === 0) {
    return { events: [] as CalendarEvent[], projects: projectList }
  }

  const [{ data: tasks }, { data: milestones }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, identifier, title, due_date, status, project_id")
      .in("project_id", projectIds)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .not("due_date", "is", null)
      .gte("due_date", start)
      .lte("due_date", end),
    supabase
      .from("milestones")
      .select("id, name, slug, target_date, status, project_id")
      .in("project_id", projectIds)
      .not("target_date", "is", null)
      .gte("target_date", start)
      .lte("target_date", end)
      .neq("status", "cancelled"),
  ])

  const events: CalendarEvent[] = []

  for (const task of tasks ?? []) {
    const project = projectById.get(task.project_id)
    if (!project || !task.due_date) continue

    events.push({
      id: task.id,
      type: "task",
      date: task.due_date,
      title: task.title,
      subtitle: task.identifier,
      href: `/projects/${project.slug}/tasks?task=${task.id}`,
      projectName: project.name,
      projectColor: project.color,
      tone: taskTone(task.status, task.due_date),
    })
  }

  for (const milestone of milestones ?? []) {
    const project = projectById.get(milestone.project_id)
    if (!project || !milestone.target_date) continue

    events.push({
      id: milestone.id,
      type: "milestone",
      date: milestone.target_date,
      title: milestone.name,
      subtitle: "Milestone",
      href: `/projects/${project.slug}/milestones`,
      projectName: project.name,
      projectColor: project.color,
      tone: milestoneTone(milestone.status, milestone.target_date),
    })
  }

  events.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date)
    if (dateCompare !== 0) return dateCompare
    if (a.type !== b.type) return a.type === "milestone" ? -1 : 1
    return a.title.localeCompare(b.title)
  })

  return { events, projects: projectList }
}

export async function getAllWorkspaceProjects(workspaceId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("projects")
    .select("id, name, slug, color")
    .eq("workspace_id", workspaceId)
    .neq("status", "archived")
    .order("name")

  return (data ?? []) as CalendarProjectOption[]
}
