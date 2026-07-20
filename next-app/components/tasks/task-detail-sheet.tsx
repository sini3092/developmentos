"use client"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState, useEffect, useMemo, useState, useTransition } from "react"
import { MessageSquare } from "lucide-react"

import { TaskChecklistSection } from "@/components/tasks/task-checklist-section"
import { TaskGithubSection } from "@/components/tasks/task-github-section"
import {
  addTaskComment,
  archiveTask,
  updateTask,
  updateTaskStatus,
} from "@/lib/actions/tasks"
import type { TaskDetail } from "@/lib/auth/task-context"
import type {
  Initiative,
  Milestone,
  ProjectMemberWithProfile,
} from "@/lib/database.types"
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
} from "@/lib/constants/tasks"
import { TaskPriorityBadge, TaskStatusBadge } from "@/components/tasks/task-badges"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useDraftComposer } from "@/hooks/use-draft-composer"
import { getInitials } from "@/lib/utils/format"

type TaskDetailSheetProps = {
  task: TaskDetail | null
  slug: string
  members: ProjectMemberWithProfile[]
  initiatives: Pick<Initiative, "id" | "name" | "slug">[]
  milestones: Array<Pick<Milestone, "id" | "name" | "slug" | "initiative_id">>
  repoOwner?: string | null
  repoName?: string | null
  canEdit: boolean
}

export function TaskDetailSheet({
  task,
  slug,
  members,
  initiatives,
  milestones,
  repoOwner,
  repoName,
  canEdit,
}: TaskDetailSheetProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const open = Boolean(task)
  const [updateState, updateAction, updatePending] = useActionState(updateTask, {})
  const [commentState, commentAction, commentPending] = useActionState(addTaskComment, {})
  const [isArchiving, startArchive] = useTransition()
  const [selectedInitiativeId, setSelectedInitiativeId] = useState("")

  const commentMetadata = useMemo(
    () => ({
      taskId: task?.id ?? "",
      slug,
    }),
    [slug, task?.id]
  )

  const commentDraft = useDraftComposer({
    kind: "task_comment",
    contextId: task?.id ?? "inactive",
    metadata: commentMetadata,
    enabled: Boolean(task?.id),
  })

  const { clearDraft: clearCommentDraft } = commentDraft

  useEffect(() => {
    if (commentState.success) {
      void clearCommentDraft()
    }
  }, [commentState.success, clearCommentDraft])

  useEffect(() => {
    setSelectedInitiativeId(task?.initiative_id ?? "")
  }, [task?.id, task?.initiative_id])

  const filteredMilestones = milestones.filter(
    (milestone) =>
      !selectedInitiativeId || milestone.initiative_id === selectedInitiativeId
  )

  function closeDialog() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("task")
    const query = params.toString()
    const basePath = pathname.includes("/tasks/board")
      ? `/projects/${slug}/tasks/board`
      : `/projects/${slug}/tasks`
    router.push(query ? `${basePath}?${query}` : basePath)
  }

  if (!task) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeDialog()}>
      <DialogContent className="!flex h-[min(88dvh,56rem)] max-h-[min(88dvh,56rem)] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4 text-left">
          <div className="flex items-center gap-2 pr-8">
            <span className="font-mono text-xs text-muted-foreground">
              {task.identifier}
            </span>
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
            <span className="ml-auto text-xs text-muted-foreground">
              {task.progress}% complete
            </span>
          </div>
          <DialogTitle className="text-left text-lg">{task.title}</DialogTitle>
          <DialogDescription className="text-left">
            Created {new Date(task.created_at).toLocaleDateString()}
            {task.creator ? ` by ${task.creator.display_name}` : null}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-5">
          {canEdit ? (
            <form id="task-edit-form" action={updateAction} className="space-y-4">
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="progress" value={String(task.progress)} />
              {updateState.error ? (
                <p className="text-sm text-danger">{updateState.error}</p>
              ) : null}
              {updateState.success ? (
                <p className="text-sm text-success">{updateState.success}</p>
              ) : null}
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title</Label>
                <Input id="edit-title" name="title" defaultValue={task.title} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  defaultValue={task.description ?? ""}
                  rows={4}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <select
                    id="edit-status"
                    name="status"
                    defaultValue={task.status}
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                  >
                    {TASK_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {TASK_STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-priority">Priority</Label>
                  <select
                    id="edit-priority"
                    name="priority"
                    defaultValue={task.priority}
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                  >
                    {TASK_PRIORITIES.map((priority) => (
                      <option key={priority} value={priority}>
                        {TASK_PRIORITY_LABELS[priority]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-assignee">Assignee</Label>
                  <select
                    id="edit-assignee"
                    name="assigneeId"
                    defaultValue={task.assignee_id ?? ""}
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                  >
                    <option value="">Unassigned</option>
                    {members.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.profile?.display_name ?? member.user_id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-due">Due date</Label>
                  <Input
                    id="edit-due"
                    name="dueDate"
                    type="date"
                    defaultValue={task.due_date ?? ""}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-initiative">Roadmap initiative</Label>
                  <select
                    id="edit-initiative"
                    name="initiativeId"
                    value={selectedInitiativeId}
                    onChange={(event) => setSelectedInitiativeId(event.target.value)}
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                  >
                    <option value="">None</option>
                    {initiatives.map((initiative) => (
                      <option key={initiative.id} value={initiative.id}>
                        {initiative.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="edit-milestone">Milestone</Label>
                  <select
                    id="edit-milestone"
                    name="milestoneId"
                    key={`${task.id}-${selectedInitiativeId}`}
                    defaultValue={task.milestone_id ?? ""}
                    className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                  >
                    <option value="">None</option>
                    {filteredMilestones.map((milestone) => (
                      <option key={milestone.id} value={milestone.id}>
                        {milestone.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </form>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap text-muted-foreground">
                {task.description || "No description provided."}
              </p>
              {task.assignee ? (
                <p>
                  Assignee: <strong>{task.assignee.display_name}</strong>
                </p>
              ) : null}
              {task.initiative ? (
                <p>
                  Initiative:{" "}
                  <Link
                    href={`/projects/${slug}/roadmap/${task.initiative.slug}`}
                    className="text-info hover:underline"
                  >
                    {task.initiative.name}
                  </Link>
                </p>
              ) : null}
            </div>
          )}

          <TaskChecklistSection
            taskId={task.id}
            slug={slug}
            items={task.checklist_items}
            members={members}
            canEdit={canEdit}
          />

          <TaskGithubSection
            taskId={task.id}
            slug={slug}
            pullRequests={task.pull_requests}
            branches={task.branches}
            repoOwner={repoOwner}
            repoName={repoName}
            canEdit={canEdit}
          />

          <section className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <MessageSquare className="size-4" />
              Comments ({task.comments.length})
            </h3>
            <div className="space-y-3">
              {task.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-lg border border-border/60 bg-surface-raised/50 p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Avatar className="size-6 rounded-md">
                      <AvatarFallback className="rounded-md text-[10px]">
                        {getInitials(comment.author?.display_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">
                      {comment.author?.display_name ?? "Member"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
                </div>
              ))}
            </div>
            {canEdit ? (
              <form
                action={commentAction}
                className="space-y-2"
                onSubmit={(event) => {
                  if (!navigator.onLine) {
                    event.preventDefault()
                    void commentDraft.queueOffline()
                  }
                }}
              >
                <input type="hidden" name="taskId" value={task.id} />
                <input type="hidden" name="slug" value={slug} />
                {commentDraft.queued ? (
                  <p className="text-sm text-warning">
                    Comment saved offline — it will post when you reconnect.
                  </p>
                ) : null}
                <Textarea
                  name="body"
                  placeholder="Add a comment..."
                  rows={3}
                  required
                  value={commentDraft.value}
                  onChange={(event) => commentDraft.setValue(event.target.value)}
                />
                {commentState.error ? (
                  <p className="text-sm text-danger">{commentState.error}</p>
                ) : null}
                <Button type="submit" size="sm" disabled={commentPending || !commentDraft.value.trim()}>
                  {commentPending ? "Posting..." : "Post comment"}
                </Button>
              </form>
            ) : null}
          </section>
        </div>

        {canEdit ? (
          <div className="shrink-0 space-y-3 border-t border-border/60 bg-background px-6 py-4">
            <div className="flex flex-wrap gap-2">
              {TASK_STATUSES.filter((status) => status !== task.status).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void updateTaskStatus(task.id, slug, status).then(() => router.refresh())
                  }}
                >
                  Mark {TASK_STATUS_LABELS[status]}
                </Button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-danger"
                disabled={isArchiving}
                onClick={() => {
                  startArchive(async () => {
                    await archiveTask(task.id, slug)
                    closeDialog()
                    router.refresh()
                  })
                }}
              >
                Archive task
              </Button>
              <Button type="submit" form="task-edit-form" disabled={updatePending}>
                {updatePending ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
