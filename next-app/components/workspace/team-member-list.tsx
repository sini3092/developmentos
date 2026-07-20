import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { MemberWithProfile, WorkspaceInvitation } from "@/lib/database.types"
import { WORKSPACE_ROLE_LABELS } from "@/lib/constants/roles"
import { getInitials } from "@/lib/utils/format"

type TeamMemberListProps = {
  members: MemberWithProfile[]
  pendingInvitations: WorkspaceInvitation[]
}

export function TeamMemberList({
  members,
  pendingInvitations,
}: TeamMemberListProps) {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-medium">Members</h3>
        <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
          {members.map((member) => {
            const displayName =
              member.profile?.display_name ?? "Unnamed member"

            return (
              <div
                key={member.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-9 rounded-lg">
                    <AvatarFallback className="rounded-lg bg-secondary text-xs">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(member.joined_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">
                  {WORKSPACE_ROLE_LABELS[member.role]}
                </Badge>
              </div>
            )
          })}
        </div>
      </section>

      {pendingInvitations.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Pending invitations</h3>
          <div className="divide-y divide-border/60 rounded-xl border border-border/60 bg-card">
            {pendingInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{invitation.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Expires {new Date(invitation.expires_at).toLocaleDateString()} ·{" "}
                    <span className="font-mono">
                      /invite/{invitation.token.slice(0, 8)}…
                    </span>
                  </p>
                </div>
                <Badge variant="outline">
                  {WORKSPACE_ROLE_LABELS[invitation.role]}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
