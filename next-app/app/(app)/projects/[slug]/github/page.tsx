import Link from "next/link"
import { GitBranch } from "lucide-react"

import { GithubHistoryList } from "@/components/github/github-history-list"
import { PageHeader } from "@/components/layout/page-header"
import { ProjectNav } from "@/components/projects/project-nav"
import { Button } from "@/components/ui/button"
import { requireProjectGithubHistory } from "@/lib/auth/github-history-context"

type GithubPageProps = {
  params: Promise<{ slug: string }>
}

export default async function ProjectGithubPage({ params }: GithubPageProps) {
  const { slug } = await params
  const { project, canManage, events } = await requireProjectGithubHistory(slug)

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="GitHub history"
        description={`Commits, pushes, and linked changes for ${project.name}`}
        icon={GitBranch}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href="/settings">Connect GitHub</Link>
        </Button>
      </PageHeader>

      <ProjectNav slug={slug} canManage={canManage} />

      <div className="flex flex-1 flex-col gap-4 p-6">
        {!project.github_owner || !project.github_repo_name ? (
          <p className="rounded-xl border border-dashed border-border/80 bg-surface-raised/50 px-4 py-6 text-sm text-muted-foreground">
            Link a private GitHub repository in project settings to start recording
            commits and pull request activity here.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Repository:{" "}
            <span className="font-medium text-foreground">
              {project.github_owner}/{project.github_repo_name}
            </span>
          </p>
        )}

        <GithubHistoryList events={events} />
      </div>
    </div>
  )
}
