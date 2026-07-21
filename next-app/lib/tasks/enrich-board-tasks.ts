import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database, Label, Profile, Task } from "@/lib/database.types"
import type { TaskWithPeople } from "@/lib/auth/task-context"

type AdminClient = SupabaseClient<Database>

export async function enrichBoardTasks(
  supabase: AdminClient,
  tasks: Task[]
): Promise<TaskWithPeople[]> {
  if (tasks.length === 0) {
    return []
  }

  const userIds = [
    ...new Set(
      tasks
        .flatMap((task) => [task.assignee_id, task.creator_id])
        .filter((id): id is string => Boolean(id))
    ),
  ]

  const taskIds = tasks.map((task) => task.id)

  const [{ data: profiles }, { data: comments }, { data: labelLinks }, { data: checklistItems }, { data: attachments }] =
    await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("*").in("id", userIds)
        : Promise.resolve({ data: [] as Profile[] }),
      supabase.from("task_comments").select("task_id").in("task_id", taskIds),
      supabase.from("task_labels").select("task_id, label_id").in("task_id", taskIds),
      supabase
        .from("task_checklist_items")
        .select("id, task_id, title, completed, position")
        .in("task_id", taskIds)
        .order("position", { ascending: true }),
      supabase.from("task_attachments").select("task_id").in("task_id", taskIds),
    ])

  const labelIds = [...new Set((labelLinks ?? []).map((link) => link.label_id))]
  const { data: labels } =
    labelIds.length > 0
      ? await supabase.from("labels").select("*").in("id", labelIds)
      : { data: [] as Label[] }

  const labelsByTask = new Map<string, Label[]>()
  for (const link of labelLinks ?? []) {
    const label = labels?.find((item) => item.id === link.label_id)
    if (!label) continue
    const list = labelsByTask.get(link.task_id) ?? []
    list.push(label)
    labelsByTask.set(link.task_id, list)
  }

  const checklistByTask = new Map<string, { done: number; total: number }>()
  const checklistPreviewByTask = new Map<
    string,
    Array<{ id: string; title: string; completed: boolean }>
  >()

  for (const item of checklistItems ?? []) {
    const current = checklistByTask.get(item.task_id) ?? { done: 0, total: 0 }
    current.total += 1
    if (item.completed) current.done += 1
    checklistByTask.set(item.task_id, current)

    const preview = checklistPreviewByTask.get(item.task_id) ?? []
    if (preview.length < 4) {
      preview.push({
        id: item.id,
        title: item.title,
        completed: item.completed,
      })
      checklistPreviewByTask.set(item.task_id, preview)
    }
  }

  const attachmentCounts = (attachments ?? []).reduce<Record<string, number>>(
    (counts, attachment) => {
      counts[attachment.task_id] = (counts[attachment.task_id] ?? 0) + 1
      return counts
    },
    {}
  )

  const commentCounts = (comments ?? []).reduce<Record<string, number>>(
    (counts, comment) => {
      counts[comment.task_id] = (counts[comment.task_id] ?? 0) + 1
      return counts
    },
    {}
  )

  return tasks.map((task) => ({
    ...task,
    assignee: profiles?.find((profile) => profile.id === task.assignee_id) ?? null,
    creator: profiles?.find((profile) => profile.id === task.creator_id) ?? null,
    comment_count: commentCounts[task.id] ?? 0,
    labels: labelsByTask.get(task.id) ?? [],
    checklist_done: checklistByTask.get(task.id)?.done ?? 0,
    checklist_total: checklistByTask.get(task.id)?.total ?? 0,
    checklist_preview: checklistPreviewByTask.get(task.id) ?? [],
    attachment_count: attachmentCounts[task.id] ?? 0,
  }))
}
