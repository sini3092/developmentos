import Link from "next/link"
import { FolderKanban, Plus } from "lucide-react"

import { PageHeader, PlaceholderPanel } from "@/components/layout/page-header"
import { ProjectCard } from "@/components/projects/project-card"
import { SeedStarterProjectsButton } from "@/components/projects/seed-starter-projects-button"
import { Button } from "@/components/ui/button"
import { requireWorkspaceContext } from "@/lib/auth/workspace-context"

export default async function ProjectsPage() {
  const { activeWorkspace, projects, canCreateProjects } =
    await requireWorkspaceContext()

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Projects"
        description="Every game system, discipline, and production area in one connected workspace."
        icon={FolderKanban}
      >
        {canCreateProjects ? (
          <div className="flex gap-2">
            {projects.length === 0 ? (
              <SeedStarterProjectsButton workspaceId={activeWorkspace!.id} />
            ) : null}
            <Button asChild size="sm">
              <Link href="/projects/new">
                <Plus className="size-3.5" />
                New project
              </Link>
            </Button>
          </div>
        ) : null}
      </PageHeader>

      {projects.length > 0 ? (
        <div className="grid gap-4 p-6 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="p-6">
          <PlaceholderPanel
            title="No projects yet"
            description={
              canCreateProjects
                ? "Create your first project or add the starter set from the product plan."
                : "Ask a workspace owner or project lead to create a project."
            }
          />
        </div>
      )}
    </div>
  )
}
