import { createBoardList } from "@/lib/actions/board-lists"
import { executeSoulsLoreTool } from "@/lib/agents/souls-lore-tools"
import type { BoardKey } from "@/lib/constants/board-keys"
import { importEverwoodBoardPlan, upsertPlanTaskCard } from "@/lib/imports/board-plan-importer"
import type { PlanTaskCard } from "@/lib/imports/everwood-plan-data"
import { findTaskByTitle } from "@/lib/imports/task-dedup"
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

      case "tasks.upsert": {
        const title = String(input.toolInput.title ?? "").trim()
        if (!title) {
          throw new Error("Task title is required.")
        }

        const boardKey = String(input.toolInput.boardKey ?? "dev") as BoardKey
        const listName = String(input.toolInput.listName ?? "Inbox")
        const card: PlanTaskCard = {
          title,
          boardKey,
          listName,
          priority: (input.toolInput.priority as TaskPriority | undefined) ?? "medium",
          status:
            (input.toolInput.status as PlanTaskCard["status"] | undefined) ?? "backlog",
          milestone: input.toolInput.milestone ? String(input.toolInput.milestone) : undefined,
          system: input.toolInput.system ? String(input.toolInput.system) : undefined,
          description: input.toolInput.description ? String(input.toolInput.description) : undefined,
          acceptanceCriteria: input.toolInput.acceptanceCriteria
            ? String(input.toolInput.acceptanceCriteria)
            : undefined,
          checklist: Array.isArray(input.toolInput.checklist)
            ? input.toolInput.checklist.map((item) => String(item))
            : undefined,
          featureState: input.toolInput.featureState as PlanTaskCard["featureState"],
        }

        const result = await upsertPlanTaskCard(supabase, {
          projectId: input.projectId,
          workspaceId: input.workspaceId,
          userId: input.userId,
          card,
        })

        const { data: task } = await supabase
          .from("tasks")
          .select("id, identifier, title")
          .eq("id", result.taskId)
          .maybeSingle()

        return {
          tool: input.tool,
          label: input.label,
          status: "success",
          href: task ? `/projects/${input.projectSlug}/tasks/board?task=${task.id}` : undefined,
          summary: result.created
            ? `Created ${task?.identifier ?? title}`
            : `Updated ${task?.identifier ?? title}`,
          after: task ?? { title, taskId: result.taskId },
        }
      }

      case "tasks.checklist.add": {
        const taskId = String(input.toolInput.taskId ?? "")
        const title = String(input.toolInput.title ?? "").trim()
        const items = Array.isArray(input.toolInput.items)
          ? input.toolInput.items.map((item) => String(item).trim()).filter(Boolean)
          : title
            ? [title]
            : []

        if (!taskId || items.length === 0) {
          throw new Error("taskId and checklist items are required.")
        }

        const { data: existing } = await supabase
          .from("task_checklist_items")
          .select("title, position")
          .eq("task_id", taskId)

        const existingTitles = new Set(
          (existing ?? []).map((item) => item.title.trim().toLowerCase())
        )
        let position = (existing?.at(-1)?.position ?? -1) + 1
        let added = 0

        for (const item of items) {
          if (existingTitles.has(item.toLowerCase())) {
            continue
          }
          const { error } = await supabase.from("task_checklist_items").insert({
            task_id: taskId,
            title: item,
            position,
          })
          if (!error) {
            added += 1
            position += 1
            existingTitles.add(item.toLowerCase())
          }
        }

        const { data: task } = await supabase
          .from("tasks")
          .select("identifier")
          .eq("id", taskId)
          .maybeSingle()

        return {
          tool: input.tool,
          label: input.label,
          status: "success",
          summary: `Added ${added} checklist item${added === 1 ? "" : "s"} to ${task?.identifier ?? "task"}`,
          after: { taskId, added },
        }
      }

      case "tasks.checklist.complete": {
        const taskId = String(input.toolInput.taskId ?? "")
        const completeAll = Boolean(input.toolInput.all)
        const items = Array.isArray(input.toolInput.items)
          ? input.toolInput.items.map((item) => String(item).trim()).filter(Boolean)
          : input.toolInput.title
            ? [String(input.toolInput.title).trim()]
            : []

        if (!taskId) {
          throw new Error("taskId is required.")
        }

        const { data: checklistItems } = await supabase
          .from("task_checklist_items")
          .select("id, title, completed")
          .eq("task_id", taskId)

        let updated = 0
        for (const item of checklistItems ?? []) {
          const shouldComplete = completeAll
            ? true
            : items.some((target) => target.toLowerCase() === item.title.trim().toLowerCase())

          if (!shouldComplete || item.completed) {
            continue
          }

          await supabase
            .from("task_checklist_items")
            .update({
              completed: true,
              completed_at: new Date().toISOString(),
            })
            .eq("id", item.id)
          updated += 1
        }

        const { data: task } = await supabase
          .from("tasks")
          .select("identifier")
          .eq("id", taskId)
          .maybeSingle()

        return {
          tool: input.tool,
          label: input.label,
          status: "success",
          summary: `Completed ${updated} checklist item${updated === 1 ? "" : "s"} on ${task?.identifier ?? "task"}`,
          after: { taskId, updated },
        }
      }

      case "plan.import.everwood": {
        const result = await importEverwoodBoardPlan({
          supabase,
          projectId: input.projectId,
          workspaceId: input.workspaceId,
          userId: input.userId,
        })

        return {
          tool: input.tool,
          label: input.label,
          status: result.errors.length && result.tasksCreated === 0 ? "error" : "success",
          summary: `Imported Everwood plan: ${result.tasksCreated} tasks created, ${result.tasksUpdated} updated`,
          after: result,
          error:
            result.errors.length && result.tasksCreated === 0
              ? result.errors.slice(0, 3).join(" ")
              : undefined,
        }
      }

      case "plan.import.task": {
        const title = String(input.toolInput.title ?? "").trim()
        if (!title) {
          throw new Error("Task title is required.")
        }

        const existing = await findTaskByTitle(supabase, input.projectId, title, {
          boardKey: input.toolInput.boardKey
            ? (String(input.toolInput.boardKey) as BoardKey)
            : undefined,
        })

        if (existing) {
          return {
            tool: input.tool,
            label: input.label,
            status: "success",
            summary: `Task already exists: ${existing.identifier}`,
            after: existing,
          }
        }

        const card: PlanTaskCard = {
          title,
          boardKey: (String(input.toolInput.boardKey ?? "dev") as BoardKey),
          listName: String(input.toolInput.listName ?? "Inbox"),
          priority: (input.toolInput.priority as TaskPriority | undefined) ?? "medium",
          description: input.toolInput.description ? String(input.toolInput.description) : undefined,
          checklist: Array.isArray(input.toolInput.checklist)
            ? input.toolInput.checklist.map((item) => String(item))
            : undefined,
        }

        const upsert = await upsertPlanTaskCard(supabase, {
          projectId: input.projectId,
          workspaceId: input.workspaceId,
          userId: input.userId,
          card,
        })

        const { data: task } = await supabase
          .from("tasks")
          .select("id, identifier, title")
          .eq("id", upsert.taskId)
          .maybeSingle()

        return {
          tool: input.tool,
          label: input.label,
          status: "success",
          summary: `Created ${task?.identifier ?? title}`,
          href: task ? `/projects/${input.projectSlug}/tasks/board?task=${task.id}` : undefined,
          after: task ?? undefined,
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
