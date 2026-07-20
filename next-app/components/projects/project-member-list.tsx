"use client"

import { useActionState, useTransition } from "react"

import {
  removeProjectMember,
  updateProjectMemberRole,
} from "@/lib/actions/projects"
import { PROJECT_ROLE_LABELS } from "@/lib/constants/projects"
import type { ProjectMemberWithProfile } from "@/lib/database.types"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getInitials } from "@/lib/utils/format"

type ProjectMemberListProps = {
  members: ProjectMemberWithProfile[]
  slug: string
  canManage: boolean
  currentUserId: string
}

export function ProjectMemberList({
  members,
  slug,
  canManage,
  currentUserId,
}: ProjectMemberListProps) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Project members</h3>
      <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
        {members.map((member) => (
          <ProjectMemberRow
            key={member.id}
            member={member}
            slug={slug}
            canManage={canManage}
            isSelf={member.user_id === currentUserId}
          />
        ))}
      </div>
    </section>
  )
}

function ProjectMemberRow({
  member,
  slug,
  canManage,
  isSelf,
}: {
  member: ProjectMemberWithProfile
  slug: string
  canManage: boolean
  isSelf: boolean
}) {
  const [updateState, updateAction, updatePending] = useActionState(
    updateProjectMemberRole,
    {}
  )
  const [isRemoving, startRemove] = useTransition()
  const displayName = member.profile?.display_name ?? "Unnamed member"
  const canEdit = canManage && member.role !== "owner" && !isSelf

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Avatar className="size-9 rounded-lg">
          <AvatarFallback className="rounded-lg bg-secondary text-xs">
            {getInitials(displayName)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">
            {displayName}
            {isSelf ? <span className="text-muted-foreground"> (you)</span> : null}
          </p>
          <p className="text-xs text-muted-foreground">
            Joined {new Date(member.joined_at).toLocaleDateString()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canEdit ? (
          <form action={updateAction} className="flex items-center gap-2">
            <input type="hidden" name="memberId" value={member.id} />
            <input type="hidden" name="slug" value={slug} />
            <select
              name="role"
              defaultValue={member.role}
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
            >
              {Object.entries(PROJECT_ROLE_LABELS)
                .filter(([role]) => role !== "owner")
                .map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
            </select>
            <Button type="submit" size="sm" variant="outline" disabled={updatePending}>
              Save
            </Button>
          </form>
        ) : (
          <Badge variant="secondary">{PROJECT_ROLE_LABELS[member.role]}</Badge>
        )}
        {canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={isRemoving}
            onClick={() => {
              startRemove(async () => {
                await removeProjectMember(member.id, slug)
              })
            }}
          >
            Remove
          </Button>
        ) : null}
      </div>
      {updateState.error ? (
        <p className="text-sm text-danger sm:col-span-2">{updateState.error}</p>
      ) : null}
    </div>
  )
}
