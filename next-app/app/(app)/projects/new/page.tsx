import { redirect } from "next/navigation"

import { CreateProjectForm } from "@/components/projects/create-project-form"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

export default async function NewProjectPage() {
  const { activeWorkspace, canCreateProjects } = await requireWorkspaceContext()

  if (!canCreateProjects) {
    redirect("/projects")
  }

  return (
    <div className="flex flex-1 flex-col p-6">
      <CreateProjectForm workspaceId={activeWorkspace!.id} />
    </div>
  )
}
