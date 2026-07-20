import type { WorkspaceRole } from "@/lib/database.types"

export const WORKSPACE_ROLES: WorkspaceRole[] = [
  "owner",
  "project_lead",
  "team_member",
  "viewer",
]

export const WORKSPACE_ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  project_lead: "Project Lead",
  team_member: "Team Member",
  viewer: "Viewer",
}
