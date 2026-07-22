import { createBoardList } from "@/lib/actions/board-lists"
import { executeSoulsLoreTool } from "@/lib/agents/souls-lore-tools"
import type { TaskPriority } from "@/lib/database.types"
import type { SoulsActionResult } from "@/lib/souls/message-metadata"
import { formatToolError } from "@/lib/agents/tool-errors"
import { createClient } from "@/lib/supabase/server"

type ToolInput = Record<string, unknown>

const LORE_TOOLS = new Set([
  "lore.list",
  "lore.upsert",
  "lore.section.upsert",
  "lore.relationship",
  "lore.collection.create",
  "lore.collection.add",
])

export async function executeSoulsPrivateTool(input: {
  tool: string
  label: string
  toolInput: ToolInput
  projectId: string
  projectSlug: string
  workspaceId: string
  userId: string
}): Promise<SoulsActionResult> {
  const supabase = await createClient()

  try {
    if (LORE_TOOLS.has(input.tool)) {
      const result = await executeSoulsLoreTool({ ...input, supabase })
      if (result) {
        return result
      }
    }

    switch (input.tool) {
      case "tasks.list": {
        const query = String(input.toolInput.query ?? "").trim()
        let taskQuery = supabase
          .from("tasks")
          .select("id, identifier, title, status, priority, list_id")
          .eq("project_id", input.projectId)
          .is("deleted_at", null)
          .order("updated_at", { ascending: false })
          .limit(40)

        if (query) {
          taskQuery = taskQuery.or(
            `title.ilike.%${query.replace(/[%_,()]/g, "")}%,identifier.ilike.%${query.replace(/[%_,()]/g, "")}%`
          )
        }

        const { data } = await taskQuery
        return {
          tool: input.tool,
          label: input.label,
          status: "success",
          summary: `Found ${data?.length ?? 0} tasks`,
          after: { tasks: data ?? [] },
        }
      }

      case "tasks.create": {
        const title = String(input.toolInput.title ?? "").trim()
        if (!title) {
          throw new Error("Task title is required.")
        }

        const listName = input.toolInput.listName ? String(input.toolInput.listName) : null
        let listId: string | null = null

        if (listName) {
          const { data: list } = await supabase
            .from("board_lists")
            .select("id")
            .eq("project_id", input.projectId)
            .ilike("name", listName)
            .maybeSingle()
          listId = list?.id ?? null
        }

        if (!listId) {
          const { data: firstList } = await supabase
            .from("board_lists")
            .select("id")
            .eq("project_id", input.projectId)
            .order("position")
            .limit(1)
            .maybeSingle()
          listId = firstList?.id ?? null
        }

        const { data: task, error } = await supabase.rpc("create_task", {
          p_project_id: input.projectId,
          p_title: title,
          p_description: input.toolInput.description ? String(input.toolInput.description) : null,
          p_status: "backlog",
          p_priority: (input.toolInput.priority as TaskPriority) ?? "medium",
          p_assignee_id: null,
          p_discipline: "worldbuilding",
          p_due_date: null,
          p_list_id: listId,
        })

        if (error || !task) {
          throw new Error(error?.message ?? "Could not create task.")
        }

        return {
          tool: input.tool,
          label: input.label,
          status: "success",
          href: `/projects/${input.projectSlug}/tasks/board?task=${task.id}`,
          summary: `Created ${task.identifier}`,
          after: { identifier: task.identifier, title: task.title },
        }
      }

      case "tasks.update": {
        const taskId = String(input.toolInput.taskId ?? "")
        if (!taskId) {
          throw new Error("taskId is required.")
        }

        const { data: before } = await supabase
          .from("tasks")
          .select("id, identifier, title, priority, list_id")
          .eq("id", taskId)
          .eq("project_id", input.projectId)
          .maybeSingle()

        if (!before) {
          throw new Error("Task not found.")
        }

        const patch: {
          title?: string
          description?: string
          priority?: TaskPriority
          list_id?: string
          updated_at: string
        } = { updated_at: new Date().toISOString() }
        if (input.toolInput.title) patch.title = String(input.toolInput.title)
        if (input.toolInput.description !== undefined) {
          patch.description = String(input.toolInput.description)
        }
        if (input.toolInput.priority) patch.priority = input.toolInput.priority as TaskPriority

        if (input.toolInput.listName) {
          const { data: list } = await supabase
            .from("board_lists")
            .select("id")
            .eq("project_id", input.projectId)
            .ilike("name", String(input.toolInput.listName))
            .maybeSingle()
          if (list) {
            patch.list_id = list.id
          }
        }

        const { data: after, error } = await supabase
          .from("tasks")
          .update(patch)
          .eq("id", taskId)
          .select("id, identifier, title, priority, list_id")
          .single()

        if (error) {
          throw error
        }

        return {
          tool: input.tool,
          label: input.label,
          status: "success",
          href: `/projects/${input.projectSlug}/tasks/board?task=${after.id}`,
          summary: `Updated ${after.identifier}`,
          before: before ?? undefined,
          after,
        }
      }

      case "board.lists": {
        const { data } = await supabase
          .from("board_lists")
          .select("id, name, color, position")
          .eq("project_id", input.projectId)
          .order("position")

        return {
          tool: input.tool,
          label: input.label,
          status: "success",
          summary: `${data?.length ?? 0} board lists`,
          after: { lists: data ?? [] },
        }
      }

      case "board.createList": {
        const name = String(input.toolInput.name ?? "").trim()
        const result = await createBoardList(input.projectSlug, input.projectId, name)
        if (result.error) {
          throw new Error(result.error)
        }

        return {
          tool: input.tool,
          label: input.label,
          status: "success",
          summary: `Created list "${result.list?.name}"`,
          after: result.list ?? undefined,
        }
      }

      default:
        throw new Error(`Unknown tool: ${input.tool}`)
    }
  } catch (error) {
    return {
      tool: input.tool,
      label: input.label,
      status: "error",
      error: formatToolError(error),
    }
  }
}
