import { object, string, enumString } from "../schema.mjs"
import { tool, id, projectSlug } from "./shared.mjs"

export default [
  tool("developmentos_projects_list", "List accessible DevelopmentOS projects.", "projects.list"),
  tool("developmentos_projects_get", "Get a project by slug.", "projects.get", object({ slug: string("Project slug") }, ["slug"])),
  tool("developmentos_projects_create", "Create a DevelopmentOS project.", "projects.create", object({ name: string("Project name", { minLength: 1, maxLength: 120 }), description: string("Project description", { maxLength: 5000 }), taskPrefix: string("2-8 character task prefix", { minLength: 2, maxLength: 8 }), visibility: enumString("Project visibility", ["workspace", "private"]) }, ["name"])),
  tool("developmentos_projects_update", "Update project metadata. Requires project management permission.", "projects.update", object({ projectId: id("Project ID"), name: string("Project name", { minLength: 1, maxLength: 120 }), description: string("Project description", { maxLength: 5000 }), visibility: enumString("Project visibility", ["workspace", "private"]) }, ["projectId"])),
  tool("developmentos_projects_summary", "Get a rich project snapshot for AI agents: board lists, tasks, roadmap, channels, and team.", "projects.summary", object({ projectSlug }, ["projectSlug"])),
]
