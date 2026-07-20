import Link from "next/link"

import type { ProjectWithMembership } from "@/lib/database.types"
import {
  PROJECT_COLOR_CLASSES,
  PROJECT_VISIBILITY_LABELS,
  type ProjectColor,
} from "@/lib/constants/projects"
import { Badge } from "@/components/ui/badge"

type ProjectCardProps = {
  project: ProjectWithMembership
}

export function ProjectCard({ project }: ProjectCardProps) {
  const colorClass =
    PROJECT_COLOR_CLASSES[project.color as ProjectColor] ?? PROJECT_COLOR_CLASSES.blue

  return (
    <Link
      href={`/projects/${project.slug}`}
      className="group rounded-xl border border-border/60 bg-card p-5 transition-colors hover:border-border hover:bg-surface-raised"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`size-3 rounded-full ${colorClass}`} />
          <h2 className="font-medium group-hover:text-primary">{project.name}</h2>
        </div>
        <Badge variant="secondary">
          {PROJECT_VISIBILITY_LABELS[project.visibility]}
        </Badge>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
        {project.description ??
          "Overview, tasks, roadmap, design docs, lore, and activity for this project."}
      </p>
      {project.membership ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Your role: {project.membership.role.replace("_", " ")}
        </p>
      ) : null}
    </Link>
  )
}
