import type { SupabaseClient } from "@supabase/supabase-js"

import { DEVELOPMENTOS_APP_CAPABILITIES } from "@/lib/agents/app-capabilities"
import type { Database } from "@/lib/database.types"
import { enrichBoardTasks } from "@/lib/tasks/enrich-board-tasks"
import { isTaskComplete, isTaskInProgress } from "@/lib/utils/roadmap"

type QueryClient = SupabaseClient<Database>

function remainingPercent(progress: number) {
  return Math.max(0, Math.min(100, 100 - (progress ?? 0)))
}

export async function buildAgentProjectContext(
  supabase: QueryClient,
  projectId: string,
  workspaceId: string
) {
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, slug, description, task_prefix")
    .eq("id", projectId)
    .maybeSingle()

  const [
    { data: lists },
    { data: rawTasks },
    { data: channels },
    { data: memberships },
  ] = await Promise.all([
    supabase
      .from("board_lists")
      .select("id, name, color, position")
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .order("board_position", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("project_channels")
      .select("id, name, slug, description")
      .eq("project_id", projectId)
      .order("position", { ascending: true }),
    supabase.from("workspace_members").select("user_id, role").eq("workspace_id", workspaceId),
  ])

  const tasks = rawTasks?.length ? await enrichBoardTasks(supabase, rawTasks) : []
  const memberIds = memberships?.map((row) => row.user_id) ?? []
  const { data: profiles } =
    memberIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", memberIds)
      : { data: [] as Array<{ id: string; display_name: string | null }> }

  const listNameById = new Map((lists ?? []).map((list) => [list.id, list.name]))
  const activeTasks = tasks.filter(
    (task) => task.status !== "cancelled" && !isTaskComplete(task.progress)
  )
  const inProgressTasks = activeTasks.filter((task) => isTaskInProgress(task.progress))
  const notStartedTasks = activeTasks.filter((task) => (task.progress ?? 0) === 0)
  const doneTasks = tasks.filter(
    (task) => task.status !== "cancelled" && isTaskComplete(task.progress)
  )

  const boardSections =
    lists && lists.length > 0
      ? lists.map((list) => {
          const listTasks = activeTasks.filter((task) => task.list_id === list.id)
          const lines =
            listTasks.length > 0
              ? listTasks.map((task) => {
                  const checklist =
                    task.checklist_total > 0
                      ? ` checklist ${task.checklist_done}/${task.checklist_total}`
                      : ""
                  return `- ${task.identifier} (${remainingPercent(task.progress)}% remaining) — ${task.title}${checklist}`
                })
              : ["(empty)"]
          return `### ${list.name} (list_id: ${list.id})\n${lines.join("\n")}`
        })
      : ["No board lists yet."]

  const unlistedTasks = activeTasks.filter((task) => !task.list_id || !listNameById.has(task.list_id))
  const unlistedSection =
    unlistedTasks.length > 0
      ? [
          "### Unassigned list",
          ...unlistedTasks.map((task) => {
            const checklist =
              task.checklist_total > 0
                ? ` checklist ${task.checklist_done}/${task.checklist_total}`
                : ""
            return `- ${task.identifier} (${remainingPercent(task.progress)}% remaining) — ${task.title}${checklist}`
          }),
        ].join("\n")
      : ""

  const channelLines =
    channels?.map(
      (channel) =>
        `- #${channel.slug} — ${channel.name}${channel.description ? `: ${channel.description}` : ""}`
    ) ?? []

  const memberLines =
    profiles?.map((profile) => {
      const membership = memberships?.find((row) => row.user_id === profile.id)
      return `- ${profile.display_name ?? profile.id}${membership ? ` (${membership.role})` : ""}`
    }) ?? []

  return [
    DEVELOPMENTOS_APP_CAPABILITIES,
    "",
    `## Current project: ${project?.name ?? "Unknown"} (slug: ${project?.slug ?? "unknown"})`,
    project?.description ? project.description : "",
    project?.task_prefix ? `Task prefix: ${project.task_prefix}` : "",
    "",
    "## Board summary",
    `- Active tasks: ${activeTasks.length}`,
    `- In progress (checklist started): ${inProgressTasks.length}`,
    `- Not started (0%): ${notStartedTasks.length}`,
    `- Complete (100%): ${doneTasks.length}`,
    "",
    "## Task board by list (primary source of truth)",
    boardSections.join("\n\n"),
    unlistedSection,
    "",
    "## Recently completed",
    doneTasks
      .slice(0, 10)
      .map((task) => {
        const listName = task.list_id ? listNameById.get(task.list_id) ?? "?" : "none"
        return `- ${task.identifier} [list: ${listName}] — ${task.title}`
      })
      .join("\n") || "None",
    "",
    "## Channels",
    channelLines.join("\n") || "None",
    "",
    "## Team",
    memberLines.join("\n") || "None",
    "",
    "Note: Ignore legacy task.status for workflow. Progress comes from checklists. Do not invent milestones or initiatives unless the user asks about roadmap.",
  ]
    .filter(Boolean)
    .join("\n")
}
