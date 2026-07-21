import { object, string, boolean } from "../schema.mjs"
import { tool, id } from "./shared.mjs"

export default [
  tool(
    "developmentos_checklist_list",
    "List checklist items for a task (ordered by position).",
    "checklist.list",
    object({ taskId: id("Task UUID") }, ["taskId"])
  ),
  tool(
    "developmentos_checklist_add",
    "Add a checklist item to a task.",
    "checklist.add",
    object(
      {
        taskId: id("Task UUID"),
        title: string("Checklist item title", { minLength: 1, maxLength: 500 }),
      },
      ["taskId", "title"]
    )
  ),
  tool(
    "developmentos_checklist_toggle",
    "Toggle a checklist item completed state.",
    "checklist.toggle",
    object(
      {
        itemId: id("Checklist item UUID"),
        completed: boolean("Completed"),
      },
      ["itemId", "completed"]
    )
  ),
]
