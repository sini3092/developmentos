import { Code2 } from "lucide-react"
import Link from "next/link"

import type { Project } from "@/lib/database.types"
import { formatGithubRepoLabel } from "@/lib/utils/github"
import { Badge } from "@/components/ui/badge"

type GithubRepoLinkProps = {
  project: Pick<Project, "github_repo_url" | "github_owner" | "github_repo_name">
}

export function GithubRepoLink({ project }: GithubRepoLinkProps) {
  if (!project.github_repo_url || !project.github_owner || !project.github_repo_name) {
    return null
  }

  return (
    <Badge variant="outline" asChild>
      <Link
        href={project.github_repo_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 font-normal"
      >
        <Code2 className="size-3.5" />
        {formatGithubRepoLabel({
          owner: project.github_owner,
          name: project.github_repo_name,
        })}
      </Link>
    </Badge>
  )
}
