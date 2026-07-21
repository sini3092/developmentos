import type { SupabaseClient } from "@supabase/supabase-js"

import { DEVELOPMENTOS_APP_CAPABILITIES } from "@/lib/agents/app-capabilities"
import type { Database } from "@/lib/database.types"
import { enrichBoardTasks } from "@/lib/tasks/enrich-board-tasks"

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
    { data: initiatives },
    { data: milestones },
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
      .from("initiatives")
      .select("id, name, planning_horizon, progress, status")
      .eq("project_id", projectId)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false }),
    supabase
      .from("milestones")
      .select("id, name, progress, status")
      .eq("project_id", projectId)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false }),
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
  const openTasks = tasks.filter((task) => task.status !== "done" && task.status !== "cancelled")
  const doneTasks = tasks.filter((task) => task.status === "done")
  const blockedTasks = tasks.filter((task) => task.status === "blocked")

  const boardSections =
    lists && lists.length > 0
      ? lists.map((list) => {
          const listTasks = openTasks.filter((task) => task.list_id === list.id)
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

  const unlistedTasks = openTasks.filter((task) => !task.list_id || !listNameById.has(task.list_id))
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

  const initiativeLines = (initiatives ?? []).map(
    (item) => `- ${item.name} (${item.planning_horizon}): ${item.progress}%`
  )

  const milestoneLines = (milestones ?? []).map((item) => `- ${item.name}: ${item.progress}%`)

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
    "## Task board by list",
    boardSections.join("\n\n"),
    unlistedSection,
    "",
    "## Open tasks (all lists)",
    openTasks.length > 0
      ? openTasks
          .slice(0, 50)
          .map((task) => {
            const listName = task.list_id ? listNameById.get(task.list_id) ?? "?" : "none"
            const checklist =
              task.checklist_total > 0
                ? ` checklist ${task.checklist_done}/${task.checklist_total}`
                : ""
            return `- ${task.identifier} [list: ${listName}] (${remainingPercent(task.progress)}% remaining) — ${task.title}${checklist}`
          })
          .join("\n")
      : "None",
    "",
    "## Recently done",
    doneTasks
      .slice(0, 15)
      .map((task) => `- ${task.identifier} — ${task.title}`)
      .join("\n") || "None",
    "",
    "## Blocked",
    blockedTasks.map((task) => `- ${task.identifier} — ${task.title}`).join("\n") || "None",
    "",
    "## Initiatives (auto-synced from tasks)",
    initiativeLines.join("\n") || "None",
    "",
    "## Milestones",
    milestoneLines.join("\n") || "None",
    "",
    "## Channels",
    channelLines.join("\n") || "None",
    "",
    "## Team",
    memberLines.join("\n") || "None",
  ]
    .filter(Boolean)
    .join("\n")
}
