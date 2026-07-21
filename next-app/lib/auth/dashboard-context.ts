import type {
  ActivityEvent,
  Initiative,
  Milestone,
  Profile,
  Project,
  Task,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { isTaskComplete, isTaskInProgress, remainingPercent } from "@/lib/utils/roadmap"
import {
  isBlockedListName,
  isTaskBlocked,
  isTaskOpen,
} from "@/lib/utils/task-workflow"

export type TaskWithProject = Task & {
  assignee: Profile | null
  project: Pick<Project, "id" | "name" | "slug" | "task_prefix" | "color">
  initiative: Pick<Initiative, "id" | "name" | "slug"> | null
  milestone: Pick<Milestone, "id" | "name" | "slug"> | null
  list_name: string | null
}

export type DashboardStats = {
  averageProgress: number
  activeInitiatives: number
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
  projectMap: Map<string, Pick<Project, "id" | "name" | "slug" | "task_prefix" | "color">>,
  listNameById: Map<string, string>
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
    list_name: task.list_id ? (listNameById.get(task.list_id) ?? null) : null,
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

async function getWorkspaceBoardLists(projectIds: string[]) {
  if (projectIds.length === 0) {
    return {
      listNameById: new Map<string, string>(),
      blockedListIds: new Set<string>(),
    }
  }

  const supabase = await createClient()
  const { data: boardLists } = await supabase
    .from("board_lists")
    .select("id, name")
    .in("project_id", projectIds)

  const listNameById = new Map((boardLists ?? []).map((list) => [list.id, list.name]))
  const blockedListIds = new Set(
    (boardLists ?? []).filter((list) => isBlockedListName(list.name)).map((list) => list.id)
  )

  return { listNameById, blockedListIds }
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
      averageProgress: 0,
      activeInitiatives: 0,
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

  const [{ listNameById, blockedListIds }, { data: allTasks }, { data: activity }, { data: initiatives }] =
    await Promise.all([
      getWorkspaceBoardLists(projectIds),
      supabase
        .from("tasks")
        .select("*")
        .eq("workspace_id", workspaceId)
        .is("deleted_at", null)
        .neq("status", "cancelled"),
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
  const openTasks = tasks.filter((task) => isTaskOpen(task))
  const averageProgress =
    tasks.length > 0
      ? Math.round(tasks.reduce((sum, task) => sum + (task.progress ?? 0), 0) / tasks.length)
      : 0

  const activeInitiatives =
    initiatives?.filter((initiative) => initiative.status === "active").length ?? 0

  const tasksDueThisWeek = openTasks.filter(
    (task) => task.due_date && task.due_date >= weekStart && task.due_date <= weekEnd
  ).length

  const tasksDoneThisWeek = tasks.filter(
    (task) =>
      isTaskComplete(task.progress) &&
      task.updated_at.slice(0, 10) >= weekStart &&
      task.updated_at.slice(0, 10) <= weekEnd
  ).length

  const blockedCount = tasks.filter((task) => isTaskBlocked(task, blockedListIds)).length
  const overdueCount = openTasks.filter(
    (task) => task.due_date && task.due_date < today
  ).length

  const focusRaw = openTasks
    .filter((task) => task.assignee_id === userId)
    .sort((a, b) => {
      if (isTaskInProgress(a.progress) && !isTaskInProgress(b.progress)) return -1
      if (isTaskInProgress(b.progress) && !isTaskInProgress(a.progress)) return 1
      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
      if (a.due_date) return -1
      if (b.due_date) return 1
      return b.updated_at.localeCompare(a.updated_at)
    })
    .slice(0, 6)

  const blockedRaw = tasks
    .filter((task) => isTaskBlocked(task, blockedListIds))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, 8)

  const [focusTasks, blockedTasks] = await Promise.all([
    enrichTasks(focusRaw, projectMap, listNameById),
    enrichTasks(blockedRaw, projectMap, listNameById),
  ])

  const roadmap: RoadmapSnapshotItem[] =
    initiatives?.map((initiative) => ({
      ...initiative,
      project: projectMap.get(initiative.project_id)!,
    })) ?? []

  return {
    stats: {
      averageProgress,
      activeInitiatives,
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
  const projectIds = [...projectMap.keys()]
  const today = toDateString(new Date())
  const { listNameById, blockedListIds } = await getWorkspaceBoardLists(projectIds)

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("assignee_id", userId)
    .is("deleted_at", null)
    .neq("status", "cancelled")
    .order("due_date", { ascending: true, nullsFirst: false })

  const enriched = (await enrichTasks(tasks ?? [], projectMap, listNameById)).filter((task) =>
    isTaskOpen(task)
  )

  const groups: MyWorkGroup[] = [
    {
      label: "In progress",
      tasks: enriched.filter((task) => isTaskInProgress(task.progress)),
    },
    {
      label: "Due today",
      tasks: enriched.filter((task) => task.due_date === today),
    },
    {
      label: "Blocked",
      tasks: enriched.filter((task) => isTaskBlocked(task, blockedListIds)),
    },
    {
      label: "Not started",
      tasks: enriched.filter(
        (task) =>
          (task.progress ?? 0) === 0 &&
          !isTaskBlocked(task, blockedListIds) &&
          task.due_date !== today
      ),
    },
  ]

  return groups.filter((group) => group.tasks.length > 0)
}

export { remainingPercent }
