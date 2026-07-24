import { Inbox } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { InboxList } from "@/components/inbox/inbox-list"
import { getNotifications } from "@/lib/auth/notification-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

export const dynamic = "force-dynamic"

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string }>
}) {
  const { activeWorkspace, user, projects } = await requireWorkspaceContext()
  const params = await searchParams
  const notifications = await getNotifications(activeWorkspace!.id, user.id)

  const projectsById = Object.fromEntries(
    projects.map((project) => [project.id, { name: project.name, slug: project.slug }])
  )

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Inbox"
        description="Messages from Souls, assignments, mentions, and project updates."
        icon={Inbox}
      />
      <div className="p-6">
        <InboxList
          notifications={notifications}
          workspaceId={activeWorkspace!.id}
          projectsById={projectsById}
          openNotificationId={params.n ?? null}
        />
      </div>
    </div>
  )
}
