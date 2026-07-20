"use client"

import { useActionState } from "react"

import { addProjectMember } from "@/lib/actions/projects"
import { PROJECT_ROLE_LABELS, PROJECT_ROLES } from "@/lib/constants/projects"
import type { Profile } from "@/lib/database.types"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

type AddProjectMemberFormProps = {
  projectId: string
  slug: string
  availableMembers: Array<{
    user_id: string
    profile: Profile | null
    workspace_role: string
  }>
}

export function AddProjectMemberForm({
  projectId,
  slug,
  availableMembers,
}: AddProjectMemberFormProps) {
  const [state, formAction, pending] = useActionState(addProjectMember, {})

  if (availableMembers.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 p-4 text-sm text-muted-foreground">
        All workspace members are already on this project.
      </p>
    )
  }

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
      <div>
        <h3 className="text-sm font-medium">Add member</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Add someone from your workspace to this project.
        </p>
      </div>
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="slug" value={slug} />
      {state.error ? (
        <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
          {state.success}
        </p>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="userId">Workspace member</Label>
          <select
            id="userId"
            name="userId"
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            required
          >
            <option value="">Select member</option>
            {availableMembers.map((member) => (
              <option key={member.user_id} value={member.user_id}>
                {member.profile?.display_name ?? member.user_id}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <select
            id="role"
            name="role"
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            defaultValue="team_member"
          >
            {PROJECT_ROLES.filter((role) => role !== "owner").map((role) => (
              <option key={role} value={role}>
                {PROJECT_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add"}
        </Button>
      </div>
    </form>
  )
}
