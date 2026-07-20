import { createClient } from "@/lib/supabase/server"
import { getProjectInitiatives, getProjectMilestones } from "@/lib/auth/roadmap-context"
import { getProjectTasks } from "@/lib/auth/task-context"

export async function buildSoulsProjectContext(projectId: string, workspaceId: string) {
  const supabase = await createClient()

  const [tasks, initiatives, milestones, { data: memberships }] = await Promise.all([
    getProjectTasks(projectId),
    getProjectInitiatives(projectId),
    getProjectMilestones(projectId),
    supabase.from("workspace_members").select("user_id").eq("workspace_id", workspaceId),
  ])

  const memberIds = memberships?.map((row) => row.user_id) ?? []
  const { data: profiles } =
    memberIds.length > 0
      ? await supabase.from("profiles").select("id, display_name").in("id", memberIds)
      : { data: [] as Array<{ id: string; display_name: string | null }> }

  const openTasks = tasks.filter((task) => task.status !== "done" && task.status !== "cancelled")
  const doneTasks = tasks.filter((task) => task.status === "done")
  const blockedTasks = tasks.filter((task) => task.status === "blocked")

  const taskLines = openTasks.slice(0, 40).map((task) => {
    const checklist =
      task.checklist_total > 0
        ? ` checklist ${task.checklist_done}/${task.checklist_total}`
        : ""
    return `- ${task.identifier} [${task.status}] ${task.progress}% — ${task.title}${checklist}`
  })

  const initiativeLines = initiatives.map(
    (item) =>
      `- ${item.name} (${item.planning_horizon}): ${item.progress}% — ${item.task_count} tasks linked`
  )

  const milestoneLines = milestones.map(
    (item) => `- ${item.name}: ${item.progress}% — ${item.task_count} tasks`
  )

  const memberLines =
    profiles?.map((profile) => `- ${profile.display_name ?? profile.id}`) ?? []

  return [
    "## Open tasks",
    taskLines.length > 0 ? taskLines.join("\n") : "None",
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
    "## Team",
    memberLines.join("\n") || "None",
  ].join("\n")
}
