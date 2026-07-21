import { object } from "../schema.mjs"
import { tool, projectSlug } from "./shared.mjs"

export default [
  tool(
    "developmentos_board_lists",
    "List Trello-style board lists for a project (custom columns, not status).",
    "board.lists",
    object({ projectSlug }, ["projectSlug"])
  ),
]
