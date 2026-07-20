"use client"

import { useActionState, useEffect, useState } from "react"

import { createMilestone } from "@/lib/actions/roadmap"
import type { Initiative, ProjectMemberWithProfile } from "@/lib/database.types"
import { MILESTONE_STATUSES, MILESTONE_STATUS_LABELS } from "@/lib/constants/roadmap"
import { slugify } from "@/lib/utils/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type CreateMilestoneFormProps = {
  workspaceId: string
  projectId: string
  slug: string
  initiatives: Pick<Initiative, "id" | "name">[]
  members: ProjectMemberWithProfile[]
  defaultInitiativeId?: string
  onSuccess?: () => void
}

export function CreateMilestoneForm({
  workspaceId,
  projectId,
  slug,
  initiatives,
  members,
  defaultInitiativeId,
  onSuccess,
}: CreateMilestoneFormProps) {
  const [state, formAction, pending] = useActionState(createMilestone, {})
  const [name, setName] = useState("")
  const [milestoneSlug, setMilestoneSlug] = useState("")

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
            if (!milestoneSlug) {
              setMilestoneSlug(slugify(event.target.value))
            }
          }}
          placeholder="Vertical slice playable"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="milestoneSlug">Slug</Label>
        <Input
          id="milestoneSlug"
          name="milestoneSlug"
          value={milestoneSlug}
          onChange={(event) => setMilestoneSlug(slugify(event.target.value))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" rows={3} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="initiativeId">Initiative</Label>
          <select
            id="initiativeId"
            name="initiativeId"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            defaultValue={defaultInitiativeId ?? ""}
          >
            <option value="">None</option>
            {initiatives.map((initiative) => (
              <option key={initiative.id} value={initiative.id}>
                {initiative.name}
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
            defaultValue="draft"
          >
            {MILESTONE_STATUSES.filter((status) => status !== "cancelled").map((status) => (
              <option key={status} value={status}>
                {MILESTONE_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="targetStart">Target start</Label>
          <Input id="targetStart" name="targetStart" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="targetDate">Target date</Label>
          <Input id="targetDate" name="targetDate" type="date" />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating…" : "Create milestone"}
      </Button>
    </form>
  )
}
