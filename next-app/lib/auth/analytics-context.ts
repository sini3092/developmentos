import type {
  ActivityEvent,
  Discipline,
  InitiativeHealth,
  Profile,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { isTaskComplete, isTaskInProgress } from "@/lib/utils/roadmap"
import { isBlockedListName, isTaskBlocked, isTaskOpen } from "@/lib/utils/task-workflow"

export type CountItem = {
  label: string
  value: number
  tone?: "default" | "success" | "warning" | "danger" | "info"
}

export type ProjectAnalytics = {
  stats: {
    totalTasks: number
    doneTasks: number
    blockedTasks: number
    overdueTasks: number
    openTasks: number
    completionRate: number
    activeInitiatives: number
    atRiskInitiatives: number
    activeMilestones: number
    designDocs: number
    loreEntries: number
  }
  tasksByStatus: CountItem[]
  tasksByProgress: CountItem[]
  tasksByDiscipline: CountItem[]
  initiativesByHealth: CountItem[]
  activity: Array<ActivityEvent & { actor: Profile | null }>
}

export type WorkspaceAnalytics = {
  stats: {
    totalTasks: number
    doneTasks: number
    blockedTasks: number
    overdueTasks: number
    openTasks: number
    completionRate: number
    activeProjects: number
    activeInitiatives: number
    atRiskInitiatives: number
    activeMilestones: number
    designDocs: number
    loreEntries: number
  }
  tasksByStatus: CountItem[]
  tasksByProgress: CountItem[]
  tasksByProject: CountItem[]
  initiativesByHealth: CountItem[]
}

const TASK_PROGRESS_LABELS = {
  complete: "Complete",
  in_progress: "In progress",
  not_started: "Not started",
} as const

const DISCIPLINE_LABELS: Record<Discipline, string> = {
  design: "Design",
  programming: "Programming",
  "3d_art": "3D Art",
  "2d_art": "2D Art",
  animation: "Animation",
  audio: "Audio",
  narrative: "Narrative",
  worldbuilding: "Worldbuilding",
  ui_ux: "UI/UX",
  testing: "Testing",
  production: "Production",
}

const HEALTH_LABELS: Record<InitiativeHealth, string> = {
  on_track: "On Track",
  at_risk: "At Risk",
  off_track: "Off Track",
  no_status: "No Status",
}

function countByField<T extends string>(
  rows: Array<{ field: T | null }>,
  labels: Record<T, string>,
  tones?: Partial<Record<T, CountItem["tone"]>>
): CountItem[] {
  const counts = new Map<string, number>()

  for (const row of rows) {
    if (!row.field) continue
    const label = labels[row.field]
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }

  return [...counts.entries()]
    .map(([label, value]) => {
      const key = Object.entries(labels).find(([, l]) => l === label)?.[0] as T | undefined
      return {
        label,
        value,
        tone: key ? tones?.[key] : undefined,
      }
    })
    .sort((a, b) => b.value - a.value)
}

function buildTasksByProgress(
  tasks: Array<{ progress?: number | null }>
): CountItem[] {
  const complete = tasks.filter((task) => isTaskComplete(task.progress)).length
  const inProgress = tasks.filter((task) => isTaskInProgress(task.progress)).length
  const notStarted = Math.max(0, tasks.length - complete - inProgress)

  const items: CountItem[] = [
    { label: TASK_PROGRESS_LABELS.complete, value: complete, tone: "success" },
    { label: TASK_PROGRESS_LABELS.in_progress, value: inProgress, tone: "info" },
    { label: TASK_PROGRESS_LABELS.not_started, value: notStarted, tone: "default" },
  ]

  return items.filter((item) => item.value > 0)
}

async function getBlockedListIds(projectIds: string[]) {
  if (projectIds.length === 0) {
    return new Set<string>()
  }

  const supabase = await createClient()
  const { data: boardLists } = await supabase
    .from("board_lists")
    .select("id, name")
    .in("project_id", projectIds)

  return new Set(
    (boardLists ?? []).filter((list) => isBlockedListName(list.name)).map((list) => list.id)
  )
}

export async function getProjectAnalytics(
  projectId: string,
  activityLimit = 50
): Promise<ProjectAnalytics> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [
    { data: tasks },
    { data: initiatives },
    { data: milestones },
    { count: designDocs },
    { count: loreEntries },
    { data: activity },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("status, discipline, due_date, progress, list_id")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .neq("status", "cancelled"),
    supabase
      .from("initiatives")
      .select("health, status")
      .eq("project_id", projectId)
      .neq("status", "cancelled"),
    supabase
      .from("milestones")
      .select("status")
      .eq("project_id", projectId)
      .neq("status", "cancelled"),
    supabase
      .from("design_documents")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .neq("status", "archived"),
    supabase
      .from("lore_entries")
      .select("*", { count: "exact", head: true })
      .eq("project_id", projectId)
      .neq("canon_status", "archived"),
    supabase
      .from("activity_events")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(activityLimit),
  ])

  const taskRows = tasks ?? []
  const blockedListIds = await getBlockedListIds([projectId])

  const totalTasks = taskRows.length
  const doneTasks = taskRows.filter((task) => isTaskComplete(task.progress)).length
  const blockedTasks = taskRows.filter((task) => isTaskBlocked(task, blockedListIds)).length
  const openTasks = taskRows.filter((task) => isTaskOpen(task)).length
  const overdueTasks = taskRows.filter(
    (task) => task.due_date && task.due_date < today && isTaskOpen(task)
  ).length

  const initiativeRows = initiatives ?? []
  const activeInitiatives = initiativeRows.filter(
    (item) => item.status === "active"
  ).length
  const atRiskInitiatives = initiativeRows.filter(
    (item) => item.health === "at_risk" || item.health === "off_track"
  ).length

  const activeMilestones =
    milestones?.filter((item) => item.status === "active").length ?? 0

  const actorIds = [
    ...new Set(
      (activity ?? [])
        .map((event) => event.actor_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const { data: actors } =
    actorIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", actorIds)
      : { data: [] as Profile[] }

  const healthTones: Partial<Record<InitiativeHealth, CountItem["tone"]>> = {
    on_track: "success",
    at_risk: "warning",
    off_track: "danger",
  }

  const tasksByProgress = buildTasksByProgress(taskRows)

  return {
    stats: {
      totalTasks,
      doneTasks,
      blockedTasks,
      overdueTasks,
      openTasks,
      completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      activeInitiatives,
      atRiskInitiatives,
      activeMilestones,
      designDocs: designDocs ?? 0,
      loreEntries: loreEntries ?? 0,
    },
    tasksByStatus: tasksByProgress,
    tasksByProgress,
    tasksByDiscipline: countByField(
      taskRows
        .filter((task) => task.discipline)
        .map((task) => ({ field: task.discipline as Discipline })),
      DISCIPLINE_LABELS
    ),
    initiativesByHealth: countByField(
      initiativeRows.map((item) => ({ field: item.health as InitiativeHealth })),
      HEALTH_LABELS,
      healthTones
    ),
    activity:
      activity?.map((event) => ({
        ...event,
        actor: actors?.find((profile) => profile.id === event.actor_id) ?? null,
      })) ?? [],
  }
}

export async function getWorkspaceAnalytics(
  workspaceId: string
): Promise<WorkspaceAnalytics> {
  const supabase = await createClient()
  const today = new Date().toISOString().slice(0, 10)

  const [
    { data: projects },
    { data: tasks },
    { data: initiatives },
    { data: milestones },
    { count: designDocs },
    { count: loreEntries },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select("id, name")
      .eq("workspace_id", workspaceId)
      .eq("status", "active"),
    supabase
      .from("tasks")
      .select("status, project_id, due_date, progress, list_id")
      .eq("workspace_id", workspaceId)
      .is("deleted_at", null)
      .neq("status", "cancelled"),
    supabase
      .from("initiatives")
      .select("health, status")
      .eq("workspace_id", workspaceId)
      .neq("status", "cancelled"),
    supabase
      .from("milestones")
      .select("status")
      .eq("workspace_id", workspaceId)
      .neq("status", "cancelled"),
    supabase
      .from("design_documents")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("status", "archived"),
    supabase
      .from("lore_entries")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspaceId)
      .neq("canon_status", "archived"),
  ])

  const projectIds = (projects ?? []).map((project) => project.id)
  const projectMap = new Map((projects ?? []).map((project) => [project.id, project.name]))
  const taskRows = tasks ?? []
  const blockedListIds = await getBlockedListIds(projectIds)

  const totalTasks = taskRows.length
  const doneTasks = taskRows.filter((task) => isTaskComplete(task.progress)).length
  const blockedTasks = taskRows.filter((task) => isTaskBlocked(task, blockedListIds)).length
  const openTasks = taskRows.filter((task) => isTaskOpen(task)).length
  const overdueTasks = taskRows.filter(
    (task) => task.due_date && task.due_date < today && isTaskOpen(task)
  ).length

  const initiativeRows = initiatives ?? []
  const activeInitiatives = initiativeRows.filter((item) => item.status === "active").length
  const atRiskInitiatives = initiativeRows.filter(
    (item) => item.health === "at_risk" || item.health === "off_track"
  ).length

  const activeMilestones =
    milestones?.filter((item) => item.status === "active").length ?? 0

  const healthTones: Partial<Record<InitiativeHealth, CountItem["tone"]>> = {
    on_track: "success",
    at_risk: "warning",
    off_track: "danger",
  }

  const projectCounts = new Map<string, number>()
  for (const task of taskRows) {
    const label = projectMap.get(task.project_id) ?? "Unknown project"
    projectCounts.set(label, (projectCounts.get(label) ?? 0) + 1)
  }

  const tasksByProject = [...projectCounts.entries()]
    .map(([label, value]) => ({ label, value, tone: "info" as const }))
    .sort((a, b) => b.value - a.value)

  const tasksByProgress = buildTasksByProgress(taskRows)

  return {
    stats: {
      totalTasks,
      doneTasks,
      blockedTasks,
      overdueTasks,
      openTasks,
      completionRate: totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0,
      activeProjects: projects?.length ?? 0,
      activeInitiatives,
      atRiskInitiatives,
      activeMilestones,
      designDocs: designDocs ?? 0,
      loreEntries: loreEntries ?? 0,
    },
    tasksByStatus: tasksByProgress,
    tasksByProgress,
    tasksByProject,
    initiativesByHealth: countByField(
      initiativeRows.map((item) => ({ field: item.health as InitiativeHealth })),
      HEALTH_LABELS,
      healthTones
    ),
  }
}
