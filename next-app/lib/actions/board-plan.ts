"use server"

import { revalidatePath } from "next/cache"

import { importEverwoodBoardPlan } from "@/lib/imports/board-plan-importer"
import { createClient } from "@/lib/supabase/server"

export type BoardPlanActionState = {
  error?: string
  success?: string
  summary?: string
}

export async function importEverwoodPlanForProject(
  projectSlug: string
): Promise<BoardPlanActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const { data: project } = await supabase
    .from("projects")
    .select("id, workspace_id, slug, name")
    .eq("slug", projectSlug)
    .eq("status", "active")
    .maybeSingle()

  if (!project) {
    return { error: "Project not found." }
  }

  const result = await importEverwoodBoardPlan({
    supabase,
    projectId: project.id,
    workspaceId: project.workspace_id,
    userId: user.id,
  })

  revalidatePath(`/projects/${project.slug}/tasks/board`)
  revalidatePath(`/projects/${project.slug}/milestones`)
  revalidatePath(`/projects/${project.slug}/decisions`)
  revalidatePath(`/projects/${project.slug}/lore`)
  revalidatePath(`/projects/${project.slug}/design`)

  const summary = [
    `Lists: ${result.listsCreated} created, ${result.listsReused} reused`,
    `Tasks: ${result.tasksCreated} created, ${result.tasksUpdated} updated`,
    `Checklists: ${result.checklistsAdded} items added`,
    `Milestones: ${result.milestonesCreated}`,
    `Decisions: ${result.decisionsCreated}`,
    `Design docs: ${result.designDocsCreated}`,
    `Lore entries: ${result.loreEntriesCreated}`,
    result.errors.length ? `Errors: ${result.errors.length}` : null,
  ]
    .filter(Boolean)
    .join(" · ")

  if (result.errors.length > 0 && result.tasksCreated === 0 && result.tasksUpdated === 0) {
    return {
      error: `Import failed. ${result.errors.slice(0, 3).join(" ")}`,
      summary,
    }
  }

  return {
    success: `Everwood board plan imported for ${project.name}.`,
    summary,
  }
}
