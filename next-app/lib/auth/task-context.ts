import type {
  Asset,
  Decision,
  DesignDocument,
  Discipline,
  Initiative,
  Label,
  LoreEntry,
  Milestone,
  Profile,
  Task,
  TaskAttachment,
  TaskChecklistItem,
  TaskComment,
  TaskDependencyGraph,
  TaskGithubPullRequest,
  TaskGithubBranch,
  TaskPriority,
  TaskStatus,
} from "@/lib/database.types"
import { requireProject } from "@/lib/auth/project-context"
import { createClient } from "@/lib/supabase/server"
import { enrichBoardTasks } from "@/lib/tasks/enrich-board-tasks"

export type ChecklistPreviewItem = {
  id: string
  title: string
  completed: boolean
}

export type TaskWithPeople = Task & {
  assignee: Profile | null
  creator: Profile | null
  comment_count: number
  labels: Label[]
  checklist_done: number
  checklist_total: number
  checklist_preview: ChecklistPreviewItem[]
  attachment_count: number
}

export type TaskLinkedAsset = Pick<Asset, "id" | "name" | "slug" | "asset_type" | "status">

export type TaskLinkedDecision = Pick<Decision, "id" | "title" | "slug" | "status"> & {
  link_id: string
}

export type TaskLinkedDesignDocument = Pick<DesignDocument, "id" | "title" | "slug" | "status"> & {
  link_id: string
}

export type TaskLinkedLoreEntry = Pick<LoreEntry, "id" | "name" | "slug" | "canon_status"> & {
  link_id: string
}

export type TaskLinkedDependency = Pick<Task, "id" | "identifier" | "title" | "status"> & {
  link_id: string
}

export type TaskDetail = TaskWithPeople & {
  comments: Array<TaskComment & { author: Profile | null }>
  initiative: Pick<Initiative, "id" | "name" | "slug"> | null
  milestone: Pick<Milestone, "id" | "name" | "slug"> | null
  checklist_items: TaskChecklistItem[]
  pull_requests: TaskGithubPullRequest[]
  branches: TaskGithubBranch[]
  attachments: Array<TaskAttachment & { uploader: Profile | null }>
  linked_assets: TaskLinkedAsset[]
  linked_decisions: TaskLinkedDecision[]
  linked_design_documents: TaskLinkedDesignDocument[]
  linked_lore_entries: TaskLinkedLoreEntry[]
  blocked_by: TaskLinkedDependency[]
  blocks: TaskLinkedDependency[]
}

export type TaskListFilters = {
  status?: TaskStatus | "all"
  listId?: string | "all"
  assigneeId?: string | "all" | "unassigned"
  search?: string
  priority?: TaskPriority | "all"
  discipline?: Discipline | "all"
  labelId?: string | "all"
  milestoneId?: string | "all"
}

export async function getProjectTasks(
  projectId: string,
  filters: TaskListFilters = {}
) {
  const supabase = await createClient()

  let query = supabase
    .from("tasks")
    .select("*")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("board_position", { ascending: true })
    .order("created_at", { ascending: false })

  if (filters.status && filters.status !== "all") {
    query = query.eq("status", filters.status)
  }

  if (filters.listId && filters.listId !== "all") {
    query = query.eq("list_id", filters.listId)
  }

  if (filters.assigneeId === "unassigned") {
    query = query.is("assignee_id", null)
  } else if (filters.assigneeId && filters.assigneeId !== "all") {
    query = query.eq("assignee_id", filters.assigneeId)
  }

  if (filters.search?.trim()) {
    query = query.or(
      `title.ilike.%${filters.search.trim()}%,identifier.ilike.%${filters.search.trim()}%`
    )
  }

  if (filters.priority && filters.priority !== "all") {
    query = query.eq("priority", filters.priority)
  }

  if (filters.discipline && filters.discipline !== "all") {
    query = query.eq("discipline", filters.discipline)
  }

  if (filters.milestoneId && filters.milestoneId !== "all") {
    query = query.eq("milestone_id", filters.milestoneId)
  }

  if (filters.labelId && filters.labelId !== "all") {
    const { data: labelLinks } = await supabase
      .from("task_labels")
      .select("task_id")
      .eq("label_id", filters.labelId)

    const labeledTaskIds = labelLinks?.map((link) => link.task_id) ?? []
    if (labeledTaskIds.length === 0) {
      return [] as TaskWithPeople[]
    }

    query = query.in("id", labeledTaskIds)
  }

  const { data: tasks, error } = await query

  if (error || !tasks?.length) {
    return [] as TaskWithPeople[]
  }

  return enrichBoardTasks(supabase, tasks)
}

export async function getTaskDetail(taskId: string, projectSlug: string) {
  const { project } = await requireProject(projectSlug)
  const supabase = await createClient()

  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("project_id", project.id)
    .is("deleted_at", null)
    .maybeSingle()

  if (!task) {
    return null
  }

  const userIds = [task.assignee_id, task.creator_id].filter(
    (id): id is string => Boolean(id)
  )

  const [{ data: profiles }, { data: comments }, { data: initiative }, { data: milestone }, { data: labelLinks }, { data: checklistItems }, { data: pullRequests }, { data: branches }, { data: taskAttachments }, { data: assetLinks }, { data: decisionLinks }, { data: referenceLinks }, { data: blockedByLinks }, { data: blocksLinks }] =
    await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("*").in("id", userIds)
      : Promise.resolve({ data: [] as Profile[] }),
    supabase
      .from("task_comments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: true }),
    task.initiative_id
      ? supabase
          .from("initiatives")
          .select("id, name, slug")
          .eq("id", task.initiative_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    task.milestone_id
      ? supabase
          .from("milestones")
          .select("id, name, slug")
          .eq("id", task.milestone_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("task_labels").select("label_id").eq("task_id", taskId),
    supabase
      .from("task_checklist_items")
      .select("*")
      .eq("task_id", taskId)
      .order("position", { ascending: true }),
    supabase
      .from("task_github_pull_requests")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
    supabase
      .from("task_github_branches")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
    supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false }),
    supabase.from("asset_task_links").select("asset_id").eq("task_id", taskId),
    supabase
      .from("decision_links")
      .select("id, decision_id")
      .eq("link_type", "task")
      .eq("linked_id", taskId),
    supabase
      .from("task_reference_links")
      .select("id, reference_type, reference_id")
      .eq("task_id", taskId),
    supabase
      .from("task_dependencies")
      .select("id, depends_on_task_id")
      .eq("task_id", taskId),
    supabase
      .from("task_dependencies")
      .select("id, task_id")
      .eq("depends_on_task_id", taskId),
  ])

  const labelIds = (labelLinks ?? []).map((link) => link.label_id)
  const { data: labels } =
    labelIds.length > 0
      ? await supabase.from("labels").select("*").in("id", labelIds)
      : { data: [] as Label[] }

  const authorIds = [
    ...new Set((comments ?? []).map((comment) => comment.author_id)),
  ]
  const uploaderIds = [
    ...new Set((taskAttachments ?? []).map((attachment) => attachment.uploaded_by)),
  ]
  const completerIds = [
    ...new Set(
      (checklistItems ?? [])
        .map((item) => item.completed_by)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const relatedUserIds = [...new Set([...authorIds, ...uploaderIds, ...completerIds])]

  const { data: relatedProfiles } =
    relatedUserIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", relatedUserIds)
      : { data: [] as Profile[] }

  const assetIds = (assetLinks ?? []).map((link) => link.asset_id)
  const decisionIds = (decisionLinks ?? []).map((link) => link.decision_id)
  const designDocIds = (referenceLinks ?? [])
    .filter((link) => link.reference_type === "design_document")
    .map((link) => link.reference_id)
  const loreEntryIds = (referenceLinks ?? [])
    .filter((link) => link.reference_type === "lore_entry")
    .map((link) => link.reference_id)
  const blockedByIds = (blockedByLinks ?? []).map((link) => link.depends_on_task_id)
  const blocksIds = (blocksLinks ?? []).map((link) => link.task_id)

  const [
    { data: linkedAssets },
    { data: linkedDecisions },
    { data: linkedDesignDocs },
    { data: linkedLoreEntries },
    { data: blockedByTasks },
    { data: blocksTasks },
  ] =
    await Promise.all([
      assetIds.length > 0
        ? supabase
            .from("assets")
            .select("id, name, slug, asset_type, status")
            .in("id", assetIds)
        : Promise.resolve({ data: [] as TaskLinkedAsset[] }),
      decisionIds.length > 0
        ? supabase
            .from("decisions")
            .select("id, title, slug, status")
            .in("id", decisionIds)
        : Promise.resolve({ data: [] as Array<Pick<Decision, "id" | "title" | "slug" | "status">> }),
      designDocIds.length > 0
        ? supabase
            .from("design_documents")
            .select("id, title, slug, status")
            .in("id", designDocIds)
        : Promise.resolve({ data: [] as Array<Pick<DesignDocument, "id" | "title" | "slug" | "status">> }),
      loreEntryIds.length > 0
        ? supabase
            .from("lore_entries")
            .select("id, name, slug, canon_status")
            .in("id", loreEntryIds)
        : Promise.resolve({ data: [] as Array<Pick<LoreEntry, "id" | "name" | "slug" | "canon_status">> }),
      blockedByIds.length > 0
        ? supabase
            .from("tasks")
            .select("id, identifier, title, status")
            .in("id", blockedByIds)
        : Promise.resolve({ data: [] as TaskLinkedDependency[] }),
      blocksIds.length > 0
        ? supabase
            .from("tasks")
            .select("id, identifier, title, status")
            .in("id", blocksIds)
        : Promise.resolve({ data: [] as TaskLinkedDependency[] }),
    ])

  const decisionLinkMap = new Map(
    (decisionLinks ?? []).map((link) => [link.decision_id, link.id])
  )
  const referenceLinkMap = new Map(
    (referenceLinks ?? []).map((link) => [`${link.reference_type}:${link.reference_id}`, link.id])
  )
  const blockedByLinkMap = new Map(
    (blockedByLinks ?? []).map((link) => [link.depends_on_task_id, link.id])
  )
  const blocksLinkMap = new Map((blocksLinks ?? []).map((link) => [link.task_id, link.id]))

  return {
    ...task,
    assignee: profiles?.find((profile) => profile.id === task.assignee_id) ?? null,
    creator: profiles?.find((profile) => profile.id === task.creator_id) ?? null,
    comment_count: comments?.length ?? 0,
    labels: labels ?? [],
    checklist_done: (checklistItems ?? []).filter((item) => item.completed).length,
    checklist_total: checklistItems?.length ?? 0,
    checklist_preview: (checklistItems ?? []).slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      completed: item.completed,
    })),
    attachment_count: taskAttachments?.length ?? 0,
    comments:
      comments?.map((comment) => ({
        ...comment,
        author:
          relatedProfiles?.find((profile) => profile.id === comment.author_id) ??
          null,
      })) ?? [],
    initiative: initiative ?? null,
    milestone: milestone ?? null,
    checklist_items: (checklistItems ?? []).map((item) => ({
      ...item,
      completer:
        relatedProfiles?.find((profile) => profile.id === item.completed_by) ?? null,
    })),
    pull_requests: pullRequests ?? [],
    branches: branches ?? [],
    attachments:
      taskAttachments?.map((attachment) => ({
        ...attachment,
        uploader:
          relatedProfiles?.find((profile) => profile.id === attachment.uploaded_by) ??
          null,
      })) ?? [],
    linked_assets: linkedAssets ?? [],
    linked_decisions:
      linkedDecisions?.map((decision) => ({
        ...decision,
        link_id: decisionLinkMap.get(decision.id) ?? "",
      })) ?? [],
    linked_design_documents:
      linkedDesignDocs?.map((document) => ({
        ...document,
        link_id: referenceLinkMap.get(`design_document:${document.id}`) ?? "",
      })) ?? [],
    linked_lore_entries:
      linkedLoreEntries?.map((entry) => ({
        ...entry,
        link_id: referenceLinkMap.get(`lore_entry:${entry.id}`) ?? "",
      })) ?? [],
    blocked_by:
      blockedByTasks?.map((dependency) => ({
        ...dependency,
        link_id: blockedByLinkMap.get(dependency.id) ?? "",
      })) ?? [],
    blocks:
      blocksTasks?.map((dependency) => ({
        ...dependency,
        link_id: blocksLinkMap.get(dependency.id) ?? "",
      })) ?? [],
  } satisfies TaskDetail
}

export async function getProjectLabels(projectId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("labels")
    .select("*")
    .eq("project_id", projectId)
    .order("name", { ascending: true })

  return (data ?? []) as Label[]
}

export async function getProjectTaskStats(projectId: string) {
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from("tasks")
    .select("progress")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .neq("status", "cancelled")

  const total = tasks?.length ?? 0
  const done = tasks?.filter((task) => (task.progress ?? 0) >= 100).length ?? 0
  const inProgress =
    tasks?.filter((task) => {
      const progress = task.progress ?? 0
      return progress > 0 && progress < 100
    }).length ?? 0
  const blocked = 0

  return { total, done, blocked, inProgress }
}

export async function getTaskDependencyGraph(projectId: string): Promise<TaskDependencyGraph> {
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, identifier, title, status")
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .order("identifier", { ascending: true })

  const nodes = tasks ?? []
  if (nodes.length === 0) {
    return { nodes: [], edges: [] }
  }

  const taskIds = nodes.map((task) => task.id)
  const taskIdSet = new Set(taskIds)

  const { data: dependencies } = await supabase
    .from("task_dependencies")
    .select("id, task_id, depends_on_task_id")
    .in("task_id", taskIds)

  const edges =
    dependencies
      ?.filter(
        (dependency) =>
          taskIdSet.has(dependency.task_id) && taskIdSet.has(dependency.depends_on_task_id)
      )
      .map((dependency) => ({
        id: dependency.id,
        blockerId: dependency.depends_on_task_id,
        dependentId: dependency.task_id,
      })) ?? []

  return { nodes, edges }
}
