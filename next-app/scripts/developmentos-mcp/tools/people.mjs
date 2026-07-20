import { object, string, enumString } from "../schema.mjs"
import { tool, projectSlug, id } from "./shared.mjs"

export default [
  tool("developmentos_team_list", "List workspace or project team members.", "team.list", object({ projectSlug })),
  tool("developmentos_assignments_list", "List tasks delegated to a team member, or all assigned tasks.", "assignments.list", object({ projectSlug, assigneeId: id("Optional assignee user ID") }, ["projectSlug"])),
  tool("developmentos_assignments_delegate", "Assign or reassign a task to a project member.", "assignments.delegate", object({ taskId: id("Task UUID"), assigneeId: id("Assignee user ID"), note: string("Optional delegation comment", { maxLength: 5000 }) }, ["taskId", "assigneeId"])),
  tool("developmentos_team_set_project_role", "Set a project member role. Requires project management permission.", "team.setRole", object({ projectSlug, userId: id("User ID"), role: enumString("Project role", ["owner", "project_lead", "team_member", "viewer"]) }, ["projectSlug", "userId", "role"])),
]
