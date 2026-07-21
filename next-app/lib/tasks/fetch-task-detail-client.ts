import type { SupabaseClient } from "@supabase/supabase-js"

import type { TaskDetail } from "@/lib/auth/task-context"
import type { Database, Profile } from "@/lib/database.types"

type QueryClient = SupabaseClient<Database>

export async function fetchTaskDetailClient(
  supabase: QueryClient,
  projectId: string,
  taskId: string
): Promise<TaskDetail | null> {
  const { data: task } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", taskId)
    .eq("project_id", projectId)
    .is("deleted_at", null)
    .maybeSingle()

  if (!task) {
    return null
  }

  const userIds = [task.assignee_id, task.creator_id].filter((id): id is string => Boolean(id))

  const [{ data: profiles }, { data: comments }, { data: checklistItems }, { data: pullRequests }, { data: branches }] =
    await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("*").in("id", userIds)
        : Promise.resolve({ data: [] as Profile[] }),
      supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true }),
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
    ])

  const authorIds = [...new Set((comments ?? []).map((comment) => comment.author_id))]
  const completerIds = [
    ...new Set(
      (checklistItems ?? [])
        .map((item) => item.completed_by)
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const relatedUserIds = [...new Set([...authorIds, ...completerIds])]

  const { data: relatedProfiles } =
    relatedUserIds.length > 0
      ? await supabase.from("profiles").select("*").in("id", relatedUserIds)
      : { data: [] as Profile[] }

  return {
    ...task,
    assignee: profiles?.find((profile) => profile.id === task.assignee_id) ?? null,
    creator: profiles?.find((profile) => profile.id === task.creator_id) ?? null,
    comment_count: comments?.length ?? 0,
    labels: [],
    checklist_done: (checklistItems ?? []).filter((item) => item.completed).length,
    checklist_total: checklistItems?.length ?? 0,
    checklist_preview: (checklistItems ?? []).slice(0, 4).map((item) => ({
      id: item.id,
      title: item.title,
      completed: item.completed,
    })),
    attachment_count: 0,
    comments:
      comments?.map((comment) => ({
        ...comment,
        author: relatedProfiles?.find((profile) => profile.id === comment.author_id) ?? null,
      })) ?? [],
    initiative: null,
    milestone: null,
    checklist_items: (checklistItems ?? []).map((item) => ({
      ...item,
      completer: relatedProfiles?.find((profile) => profile.id === item.completed_by) ?? null,
    })),
    pull_requests: pullRequests ?? [],
    branches: branches ?? [],
    attachments: [],
    linked_assets: [],
    linked_decisions: [],
    linked_design_documents: [],
    linked_lore_entries: [],
    blocked_by: [],
    blocks: [],
  }
}
