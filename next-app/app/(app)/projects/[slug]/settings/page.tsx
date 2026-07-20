import { Settings } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { AddProjectMemberForm } from "@/components/projects/add-project-member-form"
import { ProjectMemberList } from "@/components/projects/project-member-list"
import { ProjectNav } from "@/components/projects/project-nav"
import { ProjectSettingsForm } from "@/components/projects/project-settings-form"
import { GithubWebhookPanel } from "@/components/projects/github-webhook-panel"
import { ProjectAutomationsPanel } from "@/components/projects/project-automations-panel"
import { requireProject } from "@/lib/auth/project-context"
import { getProjectAutomations } from "@/lib/auth/automation-context"
import { getProjectLabels } from "@/lib/auth/task-context"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"
import { archiveProject } from "@/lib/actions/projects"
import { isAdminClientConfigured } from "@/lib/supabase/admin"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"

type ProjectSettingsPageProps = {
  params: Promise<{ slug: string }>
}

export default async function ProjectSettingsPage({
  params,
}: ProjectSettingsPageProps) {
  const { slug } = await params
  const workspaceContext = await requireWorkspaceContext()
  const { project, members, workspaceMembers, canManage } =
    await requireProject(slug)

  const [automations, projectLabels] = await Promise.all([
    getProjectAutomations(project.id),
    getProjectLabels(project.id),
  ])

  if (!canManage) {
    redirect(`/projects/${slug}`)
  }

  async function archive() {
    "use server"
    await archiveProject(project.id, slug)
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title={`${project.name} settings`}
        description="Manage project details, members, and access."
        icon={Settings}
      />

      <ProjectNav slug={slug} canManage={canManage} />

      <div className="space-y-6 p-6">
        <ProjectSettingsForm project={project} />
        <GithubWebhookPanel
          project={project}
          slug={slug}
          siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}
          adminConfigured={isAdminClientConfigured()}
        />
        <ProjectAutomationsPanel
          slug={slug}
          projectId={project.id}
          automations={automations}
          labels={projectLabels}
        />
        <AddProjectMemberForm
          projectId={project.id}
          slug={slug}
          availableMembers={workspaceMembers}
        />
        <ProjectMemberList
          members={members}
          slug={slug}
          canManage={canManage}
          currentUserId={workspaceContext.user.id}
        />

        <section className="rounded-xl border border-danger/30 bg-danger/5 p-5">
          <h3 className="text-sm font-medium text-danger">Danger zone</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Archive this project to remove it from active navigation. This can be
            restored later.
          </p>
          <form action={archive} className="mt-4">
            <Button type="submit" variant="destructive">
              Archive project
            </Button>
          </form>
        </section>
      </div>
    </div>
  )
}
