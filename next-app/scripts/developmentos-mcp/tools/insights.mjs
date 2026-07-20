import { object, string, enumString } from "../schema.mjs"
import { tool, projectSlug, limit } from "./shared.mjs"

export default [
  tool("developmentos_analytics_get", "Get project or workspace delivery analytics.", "analytics.get", object({ projectSlug })),
  tool("developmentos_search", "Search projects, tasks, roadmap, design wiki, and lore.", "search", object({ query: string("Search query", { minLength: 2, maxLength: 200 }), projectSlug, type: enumString("Result type", ["all", "project", "task", "initiative", "milestone", "design_document", "lore_entry"]), limit }, ["query"])),
]
