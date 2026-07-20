import { Users } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { CreateMemberForm } from "@/components/workspace/create-member-form"
import { TeamMemberList } from "@/components/workspace/team-member-list"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

export default async function TeamPage() {
  const { activeWorkspace, members, pendingInvitations } =
    await requireWorkspaceContext()

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Team"
        description={`Members and roles for ${activeWorkspace?.name ?? "your workspace"}.`}
        icon={Users}
      />
      <div className="space-y-6 p-6">
        <CreateMemberForm />
        <TeamMemberList members={members} pendingInvitations={pendingInvitations} />
      </div>
    </div>
  )
}
