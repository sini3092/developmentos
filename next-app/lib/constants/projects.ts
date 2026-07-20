import type { ProjectRole } from "@/lib/database.types"

export const PROJECT_COLORS = [
  "blue",
  "emerald",
  "amber",
  "purple",
  "rose",
  "cyan",
  "orange",
  "slate",
] as const

export type ProjectColor = (typeof PROJECT_COLORS)[number]

export const PROJECT_COLOR_CLASSES: Record<ProjectColor, string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  purple: "bg-purple-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
  orange: "bg-orange-500",
  slate: "bg-slate-500",
}

export const PROJECT_ROLES: ProjectRole[] = [
  "owner",
  "project_lead",
  "team_member",
  "viewer",
]

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  owner: "Owner",
  project_lead: "Project Lead",
  team_member: "Team Member",
  viewer: "Viewer",
}

export const PROJECT_VISIBILITY_LABELS = {
  workspace: "Workspace",
  private: "Private",
} as const
