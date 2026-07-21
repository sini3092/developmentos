"use client"

import { useActionState, useEffect, useState, useTransition } from "react"
import { MessageSquare } from "lucide-react"

import { TaskChecklistSection } from "@/components/tasks/task-checklist-section"
import { TaskGithubSection } from "@/components/tasks/task-github-section"
import {
  addTaskComment,
  archiveTask,
  updateTask,
  updateTaskProgress,
} from "@/lib/actions/tasks"
import type { TaskDetail } from "@/lib/auth/task-context"
import type { ProjectMemberWithProfile } from "@/lib/database.types"
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

const INSTANT_DIALOG =
  "!duration-0 data-open:animate-none data-closed:animate-none data-open:fade-in-0 data-open:zoom-in-95 data-closed:fade-out-0 data-closed:zoom-out-95"

type TaskDetailSheetProps = {
  task: TaskDetail | null
  slug: string
  members: ProjectMemberWithProfile[]
  repoOwner?: string | null
  repoName?: string | null
  canEdit: boolean
  isLoading?: boolean
  onClose: () => void
  onActivity?: () => void
}

export function TaskDetailSheet({
  task,
  slug,
  members,
  repoOwner,
  repoName,
  canEdit,
  isLoading = false,
  onClose,
  onActivity,
}: TaskDetailSheetProps) {
  const open = Boolean(task)
  const [updateState, updateAction, updatePending] = useActionState(updateTask, {})
  const [commentState, commentAction, commentPending] = useActionState(addTaskComment, {})
  const [isArchiving, startArchive] = useTransition()
  const [progressValue, setProgressValue] = useState(task?.progress ?? 0)

  const commentMetadata = {
    taskId: task?.id ?? "",
    slug,
  }

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
      onActivity?.()
    }
  }, [commentState.success, clearCommentDraft, onActivity])

  useEffect(() => {
    if (updateState.success) {
      onActivity?.()
    }
  }, [updateState.success, onActivity])

  useEffect(() => {
    setProgressValue(task?.progress ?? 0)
  }, [task?.id, task?.progress])

  function saveProgress(value: number) {
    if (!task) return
    void updateTaskProgress(slug, task.id, value).then((result) => {
      if (!result.error) onActivity?.()
    })
  }

  if (!task) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className={`${INSTANT_DIALOG} !flex h-[min(88dvh,56rem)] max-h-[min(88dvh,56rem)] w-[calc(100%-1.5rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl`}
      >
        <DialogHeader className="shrink-0 border-b border-border/60 px-6 py-4 text-left">
          {isLoading ? (
            <div className="mb-2 h-0.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full w-1/3 animate-[navigation-progress_0.9s_ease-in-out_infinite] bg-primary" />
            </div>
          ) : null}
          <div className="flex items-center gap-2 pr-8">
            <span className="font-mono text-xs text-muted-foreground">{task.identifier}</span>
            <span className="ml-auto text-xs text-muted-foreground">{progressValue}%</span>
          </div>
          <DialogTitle className="text-left text-lg">{task.title}</DialogTitle>
          <DialogDescription className="text-left">
            Created {new Date(task.created_at).toLocaleDateString()}
            {task.creator ? ` by ${task.creator.display_name}` : null}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 py-5">
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full w-1/3 animate-[navigation-progress_0.9s_ease-in-out_infinite] rounded-full bg-primary" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                <div className="h-9 w-full animate-pulse rounded bg-muted" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-24 w-full animate-pulse rounded bg-muted" />
              </div>
            </div>
          ) : null}

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="task-progress">Progress</Label>
              <span className="text-xs font-medium text-muted-foreground">{progressValue}%</span>
            </div>
            {canEdit ? (
              <input
                id="task-progress"
                type="range"
                min={0}
                max={100}
                step={5}
                value={progressValue}
                onChange={(event) => setProgressValue(Number(event.target.value))}
                onPointerUp={(event) => saveProgress(Number(event.currentTarget.value))}
                className="w-full accent-primary"
              />
            ) : null}
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${progressValue}%` }}
              />
            </div>
          </section>

          {canEdit ? (
            <form id="task-edit-form" action={updateAction} className="space-y-4">
              <input type="hidden" name="taskId" value={task.id} />
              <input type="hidden" name="slug" value={slug} />
              <input type="hidden" name="progress" value={String(progressValue)} />
              <input type="hidden" name="status" value={task.status} />
              <input type="hidden" name="priority" value={task.priority} />
              <input type="hidden" name="assigneeId" value={task.assignee_id ?? ""} />
              <input type="hidden" name="discipline" value={task.discipline ?? ""} />
              <input type="hidden" name="dueDate" value={task.due_date ?? ""} />
              <input type="hidden" name="initiativeId" value={task.initiative_id ?? ""} />
              <input type="hidden" name="milestoneId" value={task.milestone_id ?? ""} />
              {updateState.error ? (
                <p className="text-sm text-danger">{updateState.error}</p>
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
            </form>
          ) : (
            <div className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap text-muted-foreground">
                {task.description || "No description provided."}
              </p>
            </div>
          )}

          <TaskChecklistSection
            taskId={task.id}
            slug={slug}
            items={task.checklist_items}
            members={members}
            canEdit={canEdit}
            onChanged={onActivity}
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
                  Post comment
                </Button>
              </form>
            ) : null}
          </section>
        </div>

        {canEdit ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border/60 bg-background px-6 py-4">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-danger"
              disabled={isArchiving}
              onClick={() => {
                startArchive(async () => {
                  await archiveTask(task.id, slug)
                  onClose()
                  onActivity?.()
                })
              }}
            >
              Archive task
            </Button>
            <Button type="submit" form="task-edit-form" disabled={updatePending}>
              Save changes
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
