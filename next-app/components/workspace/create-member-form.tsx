"use client"

import { useActionState } from "react"

import { createWorkspaceMember } from "@/lib/actions/members"
import { WORKSPACE_ROLE_LABELS, WORKSPACE_ROLES } from "@/lib/constants/roles"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function CreateMemberForm() {
  const { activeWorkspace } = useWorkspace()
  const [state, formAction, pending] = useActionState(createWorkspaceMember, {})

  if (!activeWorkspace) {
    return null
  }

  if (activeWorkspace.role !== "owner") {
    return null
  }

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
      <div>
        <h3 className="text-sm font-medium">Create member account</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Public registration is disabled. Create accounts here and share the credentials with
          teammates. They will be asked to choose a new password on first sign-in.
        </p>
      </div>
      <input type="hidden" name="workspaceId" value={activeWorkspace.id} />
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="member-display-name">Display name</Label>
          <Input id="member-display-name" name="displayName" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="member-email">Email</Label>
          <Input id="member-email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="member-password">Temporary password</Label>
          <Input
            id="member-password"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="member-role">Role</Label>
          <select
            id="member-role"
            name="role"
            className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
            defaultValue="team_member"
          >
            {WORKSPACE_ROLES.filter((role) => role !== "owner").map((role) => (
              <option key={role} value={role}>
                {WORKSPACE_ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create member"}
      </Button>
    </form>
  )
}
