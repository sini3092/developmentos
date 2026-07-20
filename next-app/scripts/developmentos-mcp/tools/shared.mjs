import { object, string, integer } from "../schema.mjs"

export const projectSlug = string("Project slug", { minLength: 1, maxLength: 120 })
export const id = (label = "ID") => string(label, { minLength: 1, maxLength: 100 })
export const limit = integer("Maximum results", { minimum: 1, maximum: 100, default: 50 })
export const tool = (name, description, operation, inputSchema = object()) => ({ name, description, operation, inputSchema })
