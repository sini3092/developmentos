import { ListTodo } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { MyWorkView } from "@/components/my-work/my-work-view"
import { getMyWorkGroups } from "@/lib/auth/dashboard-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

export default async function MyWorkPage() {
  const { activeWorkspace, user } = await requireWorkspaceContext()
  const groups = await getMyWorkGroups(activeWorkspace!.id, user.id)

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="My Work"
        description="Your personal command center for assigned, mentioned, and focus tasks."
        icon={ListTodo}
      />
      <div className="p-6">
        <MyWorkView groups={groups} />
      </div>
    </div>
  )
}
