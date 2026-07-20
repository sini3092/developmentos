import { object, string, enumString, integer } from "../schema.mjs"
import { tool, projectSlug, id } from "./shared.mjs"

export default [
  tool("developmentos_milestones_list", "List milestones for a project.", "milestones.list", object({ projectSlug }, ["projectSlug"])),
  tool("developmentos_milestones_create", "Create a project milestone.", "milestones.create", object({ projectSlug, name: string("Milestone name", { minLength: 1, maxLength: 160 }), description: string("Description", { maxLength: 10000 }), targetDate: string("Target date (YYYY-MM-DD)", { format: "date" }), initiativeId: id("Optional initiative ID"), ownerId: id("Optional owner user ID") }, ["projectSlug", "name"])),
  tool("developmentos_milestones_update", "Update a milestone.", "milestones.update", object({ milestoneId: id("Milestone ID"), name: string("Name", { maxLength: 160 }), description: string("Description", { maxLength: 10000 }), status: enumString("Status", ["draft", "planned", "active", "completed", "missed", "cancelled"]), progress: integer("Progress percent", { minimum: 0, maximum: 100 }), health: enumString("Health", ["no_status", "on_track", "at_risk", "off_track"]), targetDate: string("Target date", { format: "date" }) }, ["milestoneId"])),
]
