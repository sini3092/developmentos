import type {
  InitiativeWithOwner,
  Profile,
  TaskStatus,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { getProjectGithubHistory, type GithubHistoryEvent } from "@/lib/auth/github-history-context"
import { buildTaskBreakdown, type InitiativeTaskBreakdown } from "@/lib/utils/roadmap"
import { getProjectInitiatives } from "@/lib/auth/roadmap-context"

export type RoadmapTaskItem = {
  id: string
  identifier: string
  title: string
  status: TaskStatus
  progress: number
  updated_at: string
  initiative: { name: string; slug: string } | null
  assignee_name: string | null
}

export type RoadmapActivityItem =
  | {
      kind: "github"
      id: string
      created_at: string
      event: GithubHistoryEvent
    }
  | {
      kind: "task_completed"
      id: string
      created_at: string
      task: RoadmapTaskItem
    }

export type ProjectRoadmapView = {
  breakdown: InitiativeTaskBreakdown
  totalTasks: number
  doneTasks: number
  openTasks: number
  blockedTasks: number
  inProgressTasks: number
  unlinkedTaskCount: number
  averageProgress: number
  completionRate: number
  recentlyCompleted: RoadmapTaskItem[]
  activeWork: RoadmapTaskItem[]
  remainingWork: RoadmapTaskItem[]
  blockedWork: RoadmapTaskItem[]
  unlinkedTasks: RoadmapTaskItem[]
  initiatives: InitiativeWithOwner[]
  githubEvents: GithubHistoryEvent[]
  githubPushCount: number
  githubPullRequestCount: number
  recentActivity: RoadmapActivityItem[]
}

const ACTIVE_STATUSES: TaskStatus[] = ["in_progress", "in_review", "ready"]

function buildRecentActivity(
  githubEvents: GithubHistoryEvent[],
  completedTasks: RoadmapTaskItem[]
): RoadmapActivityItem[] {
  const items: RoadmapActivityItem[] = [
    ...githubEvents.map((event) => ({
      kind: "github" as const,
      id: `github-${event.id}`,
      created_at: event.created_at,
      event,
    })),
    ...completedTasks.map((task) => ({
      kind: "task_completed" as const,
      id: `task-${task.id}`,
      created_at: task.updated_at,
      task,
    })),
  ]

  return items
    .sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, 20)
}

export async function getProjectRoadmapView(projectId: string): Promise<ProjectRoadmapView> {
  const supabase = await createClient()

  const [{ data: tasks }, initiatives, githubEvents] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, identifier, title, status, progress, updated_at, initiative_id, assignee_id")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false }),
    getProjectInitiatives(projectId),
    getProjectGithubHistory(projectId, 25),
  ])

  const taskRows = tasks ?? []
  const initiativeIds = [
    ...new Set(taskRows.map((task) => task.initiative_id).filter(Boolean)),
  ] as string[]
  const assigneeIds = [
    ...new Set(taskRows.map((task) => task.assignee_id).filter(Boolean)),
  ] as string[]

  const [{ data: initiativeRows }, { data: profiles }] = await Promise.all([
    initiativeIds.length > 0
      ? supabase.from("initiatives").select("id, name, slug").in("id", initiativeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; slug: string }> }),
    assigneeIds.length > 0
      ? supabase.from("profiles").select("id, display_name").in("id", assigneeIds)
      : Promise.resolve({ data: [] as Pick<Profile, "id" | "display_name">[] }),
  ])

  const initiativeMap = new Map(
    (initiativeRows ?? []).map((initiative) => [initiative.id, initiative])
  )
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  const rows: RoadmapTaskItem[] = taskRows.map((task) => {
    const initiative = task.initiative_id ? initiativeMap.get(task.initiative_id) : null
    const assignee = task.assignee_id ? profileMap.get(task.assignee_id) : null

    return {
      id: task.id,
      identifier: task.identifier,
      title: task.title,
      status: task.status,
      progress: task.progress ?? 0,
      updated_at: task.updated_at,
      initiative: initiative ? { name: initiative.name, slug: initiative.slug } : null,
      assignee_name: assignee?.display_name ?? null,
    }
  })

  const breakdown = buildTaskBreakdown(rows)
  const doneTasks = rows.filter((task) => task.status === "done")
  const openTasks = rows.filter((task) => task.status !== "done")
  const blockedWork = rows.filter((task) => task.status === "blocked")
  const activeWork = rows.filter((task) => ACTIVE_STATUSES.includes(task.status))
  const unlinkedAll = rows.filter((task) => !task.initiative)
  const recentlyCompleted = doneTasks.slice(0, 10)
  const remainingWork = openTasks
    .filter((task) => !ACTIVE_STATUSES.includes(task.status) && task.status !== "blocked")
    .slice(0, 12)

  const averageProgress =
    rows.length > 0
      ? Math.round(rows.reduce((sum, task) => sum + task.progress, 0) / rows.length)
      : 0
  const completionRate =
    rows.length > 0 ? Math.round((doneTasks.length / rows.length) * 100) : 0

  const sortedInitiatives = [...initiatives]
    .filter((initiative) => initiative.task_count > 0)
    .sort((a, b) => {
      if (b.task_count !== a.task_count) return b.task_count - a.task_count
      return b.progress - a.progress
    })

  const githubPushCount = githubEvents.filter((event) => event.event_type === "github.push").length
  const githubPullRequestCount = githubEvents.filter(
    (event) => event.event_type === "github.pull_request"
  ).length

  return {
    breakdown,
    totalTasks: rows.length,
    doneTasks: doneTasks.length,
    openTasks: openTasks.length,
    blockedTasks: blockedWork.length,
    inProgressTasks: rows.filter((task) => task.status === "in_progress").length,
    unlinkedTaskCount: unlinkedAll.length,
    averageProgress,
    completionRate,
    recentlyCompleted,
    activeWork: activeWork.slice(0, 12),
    remainingWork,
    blockedWork: blockedWork.slice(0, 8),
    unlinkedTasks: unlinkedAll.slice(0, 12),
    initiatives: sortedInitiatives,
    githubEvents,
    githubPushCount,
    githubPullRequestCount,
    recentActivity: buildRecentActivity(githubEvents, recentlyCompleted),
  }
}
