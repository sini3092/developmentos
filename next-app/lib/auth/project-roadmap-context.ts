import type { InitiativeWithOwner, Profile } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"
import { getProjectGithubHistory, type GithubHistoryEvent } from "@/lib/auth/github-history-context"
import {
  buildListBreakdown,
  buildTaskBreakdown,
  isTaskComplete,
  isTaskInProgress,
  type InitiativeTaskBreakdown,
  type RoadmapListBucket,
} from "@/lib/utils/roadmap"
import { getProjectInitiatives } from "@/lib/auth/roadmap-context"

export type RoadmapTaskItem = {
  id: string
  identifier: string
  title: string
  progress: number
  remaining: number
  updated_at: string
  list_name: string | null
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
  listBreakdown: RoadmapListBucket[]
  totalTasks: number
  doneTasks: number
  openTasks: number
  inProgressTasks: number
  unlinkedTaskCount: number
  averageProgress: number
  completionRate: number
  recentlyCompleted: RoadmapTaskItem[]
  activeWork: RoadmapTaskItem[]
  remainingWork: RoadmapTaskItem[]
  unlinkedTasks: RoadmapTaskItem[]
  initiatives: InitiativeWithOwner[]
  githubEvents: GithubHistoryEvent[]
  githubPushCount: number
  githubPullRequestCount: number
  recentActivity: RoadmapActivityItem[]
}

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

  const [{ data: tasks }, { data: lists }, initiatives, githubEvents] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, identifier, title, progress, updated_at, initiative_id, assignee_id, list_id"
      )
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false }),
    supabase
      .from("board_lists")
      .select("id, name, color, position")
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
    getProjectInitiatives(projectId),
    getProjectGithubHistory(projectId, 25),
  ])

  const taskRows = tasks ?? []
  const listRows = lists ?? []
  const listNameById = new Map(listRows.map((list) => [list.id, list.name]))

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
    const progress = task.progress ?? 0

    return {
      id: task.id,
      identifier: task.identifier,
      title: task.title,
      progress,
      remaining: Math.max(0, 100 - progress),
      updated_at: task.updated_at,
      list_name: task.list_id ? (listNameById.get(task.list_id) ?? null) : null,
      initiative: initiative ? { name: initiative.name, slug: initiative.slug } : null,
      assignee_name: assignee?.display_name ?? null,
    }
  })

  const breakdown = buildTaskBreakdown(rows)
  const listBreakdown = buildListBreakdown(taskRows, listRows)
  const doneTasks = rows.filter((task) => isTaskComplete(task.progress))
  const openTasks = rows.filter((task) => !isTaskComplete(task.progress))
  const activeWork = rows.filter((task) => isTaskInProgress(task.progress))
  const unlinkedAll = rows.filter((task) => !task.initiative)
  const recentlyCompleted = doneTasks.slice(0, 10)
  const remainingWork = openTasks.filter((task) => !isTaskInProgress(task.progress)).slice(0, 12)

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
    listBreakdown,
    totalTasks: rows.length,
    doneTasks: doneTasks.length,
    openTasks: openTasks.length,
    inProgressTasks: activeWork.length,
    unlinkedTaskCount: unlinkedAll.length,
    averageProgress,
    completionRate,
    recentlyCompleted,
    activeWork: activeWork.slice(0, 12),
    remainingWork,
    unlinkedTasks: unlinkedAll.slice(0, 12),
    initiatives: sortedInitiatives,
    githubEvents,
    githubPushCount,
    githubPullRequestCount,
    recentActivity: buildRecentActivity(githubEvents, recentlyCompleted),
  }
}
