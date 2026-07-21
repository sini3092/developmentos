import { object, string, enumString, integer, nullableString } from "../schema.mjs"
import { tool, projectSlug, id, limit } from "./shared.mjs"

const status = enumString("Task status", ["backlog", "ready", "in_progress", "in_review", "blocked", "done", "cancelled"])
const priority = enumString("Task priority", ["none", "low", "medium", "high", "urgent"])
export default [
  tool("developmentos_tasks_list", "List and filter project tasks.", "tasks.list", object({ projectSlug, status, listId: id("Board list UUID"), assigneeId: string("User ID or 'unassigned'"), query: string("Title or identifier search", { maxLength: 200 }), limit }, ["projectSlug"])),
  tool("developmentos_tasks_get", "Get one task by UUID or identifier.", "tasks.get", object({ task: string("Task UUID or identifier") }, ["task"])),
  tool("developmentos_tasks_create", "Create a task.", "tasks.create", object({ projectSlug, title: string("Task title", { minLength: 1, maxLength: 300 }), description: string("Task description", { maxLength: 30000 }), status, priority, listId: id("Board list UUID"), assigneeId: id("Assignee user ID"), milestoneId: id("Milestone ID"), initiativeId: id("Initiative ID"), dueDate: string("Due date", { format: "date" }), estimateHours: integer("Estimated hours", { minimum: 0, maximum: 10000 }) }, ["projectSlug", "title"])),
  tool("developmentos_tasks_update", "Update a task including status, list, or assignment.", "tasks.update", object({ taskId: id("Task UUID"), title: string("Task title", { maxLength: 300 }), description: string("Description", { maxLength: 30000 }), status, priority, listId: nullableString("Board list UUID; null clears"), assigneeId: nullableString("Assignee ID; null unassigns"), milestoneId: nullableString("Milestone ID; null clears"), initiativeId: nullableString("Initiative ID; null clears"), dueDate: nullableString("YYYY-MM-DD; null clears"), progress: integer("Progress percent", { minimum: 0, maximum: 100 }) }, ["taskId"])),
  tool("developmentos_tasks_comment", "Add a comment to a task.", "tasks.comment", object({ taskId: id("Task UUID"), body: string("Comment body", { minLength: 1, maxLength: 20000 }) }, ["taskId", "body"])),
]
