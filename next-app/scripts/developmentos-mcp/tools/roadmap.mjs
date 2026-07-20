import { object, string, enumString, integer } from "../schema.mjs"
import { tool, projectSlug, id } from "./shared.mjs"

export default [
  tool("developmentos_roadmap_list", "List roadmap initiatives for a project.", "roadmap.list", object({ projectSlug }, ["projectSlug"])),
  tool("developmentos_roadmap_create", "Create a roadmap initiative.", "roadmap.create", object({ projectSlug, name: string("Initiative name", { minLength: 1, maxLength: 160 }), summary: string("Summary", { maxLength: 10000 }), status: enumString("Status", ["idea", "planned", "active", "paused", "completed", "cancelled"]), priority: enumString("Priority", ["none", "low", "medium", "high", "urgent"]), ownerId: id("Owner user ID") }, ["projectSlug", "name"])),
  tool("developmentos_roadmap_update", "Update a roadmap initiative.", "roadmap.update", object({ initiativeId: id("Initiative ID"), name: string("Name", { maxLength: 160 }), summary: string("Summary", { maxLength: 10000 }), status: enumString("Status", ["idea", "planned", "active", "paused", "completed", "cancelled"]), progress: integer("Progress percent", { minimum: 0, maximum: 100 }), health: enumString("Health", ["no_status", "on_track", "at_risk", "off_track"]), ownerId: id("Owner user ID") }, ["initiativeId"])),
]
