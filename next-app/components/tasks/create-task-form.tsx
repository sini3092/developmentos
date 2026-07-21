"use client"

import { useActionState, useEffect } from "react"

import { createTask } from "@/lib/actions/tasks"
import type { BoardList } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type CreateTaskFormProps = {
  projectId: string
  slug: string
  lists: BoardList[]
  defaultListId?: string
  onSuccess?: (taskId: string) => void
}

export function CreateTaskForm({
  projectId,
  slug,
  lists,
  defaultListId,
  onSuccess,
}: CreateTaskFormProps) {
  const [state, formAction, pending] = useActionState(createTask, {})
  const initialListId = defaultListId ?? lists[0]?.id ?? ""

  useEffect(() => {
    if (state.success && state.taskId) {
      onSuccess?.(state.taskId)
    }
  }, [state.success, state.taskId, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="status" value="backlog" />
      <input type="hidden" name="priority" value="medium" />
      {state.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="What needs to be done?" required autoFocus />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Details, links, acceptance criteria..."
          rows={3}
        />
      </div>
      <div className="space-y-2">
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
      <Button type="submit" disabled={pending}>
        Create card
      </Button>
    </form>
  )
}
