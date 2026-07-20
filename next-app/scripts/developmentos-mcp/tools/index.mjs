import projects from "./projects.mjs"
import roadmap from "./roadmap.mjs"
import milestones from "./milestones.mjs"
import tasks from "./tasks.mjs"
import people from "./people.mjs"
import knowledge from "./knowledge.mjs"
import insights from "./insights.mjs"

export const toolRegistry = [...projects, ...roadmap, ...milestones, ...tasks, ...people, ...knowledge, ...insights]
export const advertisedTools = toolRegistry.map(({ operation, ...definition }) => definition)
export const toolsByName = new Map(toolRegistry.map((definition) => [definition.name, definition]))
