"use client"

import { useActionState, useEffect } from "react"

import { createTask } from "@/lib/actions/tasks"
import type { BoardList, ProjectMemberWithProfile } from "@/lib/database.types"
import {
  DISCIPLINE_LABELS,
  DISCIPLINES,
  TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
} from "@/lib/constants/tasks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type CreateTaskFormProps = {
  projectId: string
  slug: string
  members: ProjectMemberWithProfile[]
  lists: BoardList[]
  defaultListId?: string
  onSuccess?: () => void
}

export function CreateTaskForm({
  projectId,
  slug,
  members,
  lists,
  defaultListId,
  onSuccess,
}: CreateTaskFormProps) {
  const [state, formAction, pending] = useActionState(createTask, {})
  const initialListId = defaultListId ?? lists[0]?.id ?? ""

  useEffect(() => {
    if (state.success) {
      onSuccess?.()
    }
  }, [state.success, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="status" value="backlog" />
      {state.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="Shadows flicker on moving objects" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="What needs to happen, acceptance criteria, links."
          rows={4}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="listId">List</Label>
          <select
            id="listId"
            name="listId"
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            defaultValue={initialListId}
            key={initialListId}
          >
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            name="priority"
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            defaultValue="medium"
          >
            {TASK_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {TASK_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="assigneeId">Assignee</Label>
          <select
            id="assigneeId"
            name="assigneeId"
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            defaultValue=""
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
          <Label htmlFor="discipline">Discipline</Label>
          <select
            id="discipline"
            name="discipline"
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            defaultValue=""
          >
            <option value="">None</option>
            {DISCIPLINES.map((discipline) => (
              <option key={discipline} value={discipline}>
                {DISCIPLINE_LABELS[discipline]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create card"}
      </Button>
    </form>
  )
}
