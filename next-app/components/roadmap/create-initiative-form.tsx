"use client"

import { useActionState, useEffect, useState } from "react"

import { createInitiative } from "@/lib/actions/roadmap"
import type { ProjectMemberWithProfile } from "@/lib/database.types"
import {
  INITIATIVE_PRIORITIES,
  INITIATIVE_PRIORITY_LABELS,
  INITIATIVE_STATUSES,
  INITIATIVE_STATUS_LABELS,
  PLANNING_HORIZONS,
  PLANNING_HORIZON_LABELS,
} from "@/lib/constants/roadmap"
import { slugify } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type CreateInitiativeFormProps = {
  workspaceId: string
  projectId: string
  slug: string
  members: ProjectMemberWithProfile[]
  onSuccess?: () => void
}

export function CreateInitiativeForm({
  workspaceId,
  projectId,
  slug,
  members,
  onSuccess,
}: CreateInitiativeFormProps) {
  const [state, formAction, pending] = useActionState(createInitiative, {})
  const [name, setName] = useState("")
  const [initiativeSlug, setInitiativeSlug] = useState("")

  useEffect(() => {
    if (state.success) {
      onSuccess?.()
    }
  }, [state.success, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="slug" value={slug} />
      {state.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(event) => {
            setName(event.target.value)
            if (!initiativeSlug) {
              setInitiativeSlug(slugify(event.target.value))
            }
          }}
          placeholder="Core Survival Loop"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="initiativeSlug">Slug</Label>
        <Input
          id="initiativeSlug"
          name="initiativeSlug"
          value={initiativeSlug}
          onChange={(event) => setInitiativeSlug(slugify(event.target.value))}
          placeholder="core-survival-loop"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="summary">Summary</Label>
        <Textarea
          id="summary"
          name="summary"
          placeholder="What this initiative delivers and why it matters."
          rows={3}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="planningHorizon">Horizon</Label>
          <select
            id="planningHorizon"
            name="planningHorizon"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue="later"
          >
            {PLANNING_HORIZONS.map((horizon) => (
              <option key={horizon} value={horizon}>
                {PLANNING_HORIZON_LABELS[horizon]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue="idea"
          >
            {INITIATIVE_STATUSES.filter((s) => s !== "cancelled").map((status) => (
              <option key={status} value={status}>
                {INITIATIVE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            name="priority"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue="medium"
          >
            {INITIATIVE_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {INITIATIVE_PRIORITY_LABELS[priority]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ownerId">Owner</Label>
          <select
            id="ownerId"
            name="ownerId"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue=""
          >
            <option value="">Current user</option>
            {members.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.profile?.display_name ?? member.user_id}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="targetStart">Target start</Label>
          <Input id="targetStart" name="targetStart" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetCompletion">Target completion</Label>
          <Input id="targetCompletion" name="targetCompletion" type="date" />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create initiative"}
      </Button>
    </form>
  )
}
