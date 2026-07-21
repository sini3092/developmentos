import type {
  ActivityEvent,
  Initiative,
  Milestone,
  Profile,
  Project,
  Task,
  TaskStatus,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export type TaskWithProject = Task & {
  assignee: Profile | null
  project: Pick<Project, "id" | "name" | "slug" | "task_prefix" | "color">
  initiative: Pick<Initiative, "id" | "name" | "slug"> | null
  milestone: Pick<Milestone, "id" | "name" | "slug"> | null
}

export type DashboardStats = {
  activeMilestone: Pick<Milestone, "id" | "name" | "progress" | "health"> | null
  tasksDueThisWeek: number
  tasksDoneThisWeek: number
  blockedCount: number
  overdueCount: number
}

export type RoadmapSnapshotItem = Initiative & {
  project: Pick<Project, "slug" | "name" | "color">
}

export type DashboardData = {
  stats: DashboardStats
  focusTasks: TaskWithProject[]
  blockedTasks: TaskWithProject[]
  activity: ActivityEvent[]
  projectSlugs: Record<string, string>
  roadmap: RoadmapSnapshotItem[]
}

export type MyWorkGroup = {
  label: string
  tasks: TaskWithProject[]
}

function startOfWeek(date: Date) {
  const copy = new Date(date)
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  copy.setHours(0, 0, 0, 0)
  return copy
}

function endOfWeek(date: Date) {
  const start = startOfWeek(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

async function enrichTasks(
  tasks: Task[],
  projectMap: Map<string, Pick<Project, "id" | "name" | "slug" | "task_prefix" | "color">>
): Promise<TaskWithProject[]> {
  if (tasks.length === 0) {
    return []
  }

  const supabase = await createClient()
  const assigneeIds = [
    ...new Set(tasks.map((task) => task.assignee_id).filter(Boolean)),
  ] as string[]
  const initiativeIds = [
    ...new Set(tasks.map((task) => task.initiative_id).filter(Boolean)),
  ] as string[]
  const milestoneIds = [
    ...new Set(tasks.map((task) => task.milestone_id).filter(Boolean)),
  ] as string[]

  const [{ data: profiles }, { data: initiatives }, { data: milestones }] =
    await Promise.all([
      assigneeIds.length > 0
        ? supabase.from("profiles").select("*").in("id", assigneeIds)
        : { data: [] as Profile[] },
      initiativeIds.length > 0
        ? supabase.from("initiatives").select("id, name, slug").in("id", initiativeIds)
        : { data: [] },
      milestoneIds.length > 0
        ? supabase.from("milestones").select("id, name, slug").in("id", milestoneIds)
        : { data: [] },
    ])

  return tasks.map((task) => ({
    ...task,
    assignee: profiles?.find((profile) => profile.id === task.assignee_id) ?? null,
    project: projectMap.get(task.project_id)!,
    initiative:
      initiatives?.find((initiative) => initiative.id === task.initiative_id) ?? null,
    milestone: milestones?.find((milestone) => milestone.id === task.milestone_id) ?? null,
  }))
}

async function getWorkspaceProjectMap(workspaceId: string) {
  const supabase = await createClient()
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, slug, task_prefix, color")
    .eq("workspace_id", workspaceId)
    .eq("status", "active")

  return new Map((projects ?? []).map((project) => [project.id, project]))
}

export async function getDashboardData(workspaceId: string, userId: string) {
  const supabase = await createClient()
  const projectMap = await getWorkspaceProjectMap(workspaceId)
  const projectIds = [...projectMap.keys()]

  const now = new Date()
  const weekStart = toDateString(startOfWeek(now))
  const weekEnd = toDateString(endOfWeek(now))
  const today = toDateString(now)

  const empty: DashboardData = {
    stats: {
      activeMilestone: null,
      tasksDueThisWeek: 0,
      tasksDoneThisWeek: 0,
      blockedCount: 0,
      overdueCount: 0,
    },
    focusTasks: [],
    blockedTasks: [],
    activity: [],
    projectSlugs: {},
    roadmap: [],
  }

  if (projectIds.length === 0) {
    return empty
  }

  const [
    { data: allTasks },
    { data: activeMilestone },
    { data: activity },
    { data: initiatives },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .neq("status", "cancelled"),
    supabase
      .from("milestones")
      .select("id, name, progress, health")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .order("target_date", { ascending: true, nullsFirst: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("activity_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("initiatives")
      .select("*")
      .eq("workspace_id", workspaceId)
      .neq("status", "cancelled")
      .in("planning_horizon", ["now", "next"])
      .order("planning_horizon")
      .order("updated_at", { ascending: false })
      .limit(6),
  ])

  const tasks = allTasks ?? []
  const openStatuses: TaskStatus[] = [
    "backlog",
    "ready",
    "in_progress",
    "in_review",
    "blocked",
  ]

  const tasksDueThisWeek = tasks.filter(
    (task) =>
      task.due_date &&
      task.due_date >= weekStart &&
      task.due_date <= weekEnd &&
      openStatuses.includes(task.status)
  ).length

  const tasksDoneThisWeek = tasks.filter(
    (task) =>
      task.status === "done" &&
      task.updated_at.slice(0, 10) >= weekStart &&
      task.updated_at.slice(0, 10) <= weekEnd
  ).length

  const blockedCount = tasks.filter((task) => task.status === "blocked").length
  const overdueCount = tasks.filter(
    (task) =>
      task.due_date &&
      task.due_date < today &&
      openStatuses.includes(task.status)
  ).length

  const focusRaw = tasks
    .filter(
      (task) => task.assignee_id === userId && openStatuses.includes(task.status)
    )
    .sort((a, b) => {
      if (a.status === "in_progress" && b.status !== "in_progress") return -1
      if (b.status === "in_progress" && a.status !== "in_progress") return 1
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      if (a.due_date) return -1
      if (b.due_date) return 1
      return b.updated_at.localeCompare(a.updated_at)
    })
    .slice(0, 6)

  const blockedRaw = tasks
    .filter((task) => task.status === "blocked")
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 8)

  const [focusTasks, blockedTasks] = await Promise.all([
    enrichTasks(focusRaw, projectMap),
    enrichTasks(blockedRaw, projectMap),
  ])

  const roadmap: RoadmapSnapshotItem[] =
    initiatives?.map((initiative) => ({
      ...initiative,
      project: projectMap.get(initiative.project_id)!,
    })) ?? []

  return {
    stats: {
      activeMilestone: activeMilestone ?? null,
      tasksDueThisWeek,
      tasksDoneThisWeek,
      blockedCount,
      overdueCount,
    },
    focusTasks,
    blockedTasks,
    activity: activity ?? [],
    projectSlugs: Object.fromEntries(
      [...projectMap.entries()].map(([id, project]) => [id, project.slug])
    ),
    roadmap,
  }
}

export async function getMyWorkGroups(workspaceId: string, userId: string) {
  const supabase = await createClient()
  const projectMap = await getWorkspaceProjectMap(workspaceId)
  const today = toDateString(new Date())

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("assignee_id", userId)
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .neq("status", "done")
    .order("due_date", { ascending: true, nullsFirst: false })

  const enriched = await enrichTasks(tasks ?? [], projectMap)

  const groups: MyWorkGroup[] = [
    {
      label: "In progress",
      tasks: enriched.filter((task) => task.status === "in_progress"),
    },
    {
      label: "Due today",
      tasks: enriched.filter((task) => task.due_date === today),
    },
    {
      label: "Blocked",
      tasks: enriched.filter((task) => task.status === "blocked"),
    },
    {
      label: "Ready",
      tasks: enriched.filter(
        (task) =>
          task.status === "ready" && task.due_date !== today
      ),
    },
    {
      label: "Backlog",
      tasks: enriched.filter(
        (task) =>
          task.status === "backlog" ||
          task.status === "in_review"
      ),
    },
  ]

  return groups.filter((group) => group.tasks.length > 0)
}
