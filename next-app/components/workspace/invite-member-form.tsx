"use client"

import { useActionState } from "react"

import { inviteWorkspaceMember } from "@/lib/actions/workspace"
import { WORKSPACE_ROLE_LABELS, WORKSPACE_ROLES } from "@/lib/constants/roles"
import { useWorkspace } from "@/components/providers/workspace-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function InviteMemberForm() {
  const { activeWorkspace } = useWorkspace()
  const [state, formAction, pending] = useActionState(inviteWorkspaceMember, {})

  if (!activeWorkspace) {
    return null
  }

  const canInvite =
    activeWorkspace.role === "owner" || activeWorkspace.role === "project_lead"

  if (!canInvite) {
    return null
  }

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border/60 bg-card p-5">
      <div>
        <h3 className="text-sm font-medium">Invite member</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Send an invitation to join {activeWorkspace.name}.
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
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="space-y-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            name="email"
            type="email"
            placeholder="teammate@studio.com"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
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
        <Button type="submit" disabled={pending}>
          {pending ? "Sending..." : "Invite"}
        </Button>
      </div>
    </form>
  )
}
