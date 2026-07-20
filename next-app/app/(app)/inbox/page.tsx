import { Inbox } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { InboxList } from "@/components/inbox/inbox-list"
import { getNotifications } from "@/lib/auth/notification-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

export default async function InboxPage() {
  const { activeWorkspace, user } = await requireWorkspaceContext()
  const notifications = await getNotifications(activeWorkspace!.id, user.id)

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Inbox"
        description="Actionable notifications — assignments, mentions, reviews, and update requests."
        icon={Inbox}
      />
      <div className="p-6">
        <InboxList notifications={notifications} workspaceId={activeWorkspace!.id} />
      </div>
    </div>
  )
}
