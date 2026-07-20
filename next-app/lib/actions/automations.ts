"use server"

import { revalidatePath } from "next/cache"

import type {
  AutomationActionType,
  AutomationTriggerType,
  Discipline,
  TaskPriority,
  TaskStatus,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export type AutomationActionState = {
  error?: string
  success?: string
}

function revalidateAutomationPaths(slug: string) {
  revalidatePath(`/projects/${slug}/settings`)
}

export async function createProjectAutomation(
  _prevState: AutomationActionState,
  formData: FormData
): Promise<AutomationActionState> {
  const slug = String(formData.get("slug") ?? "")
  const projectId = String(formData.get("projectId") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const triggerType = String(formData.get("triggerType") ?? "") as AutomationTriggerType
  const triggerStatus = String(formData.get("triggerStatus") ?? "")
  const actionType = String(formData.get("actionType") ?? "") as AutomationActionType
  const actionStatus = String(formData.get("actionStatus") ?? "")
  const actionLabelId = String(formData.get("actionLabelId") ?? "")
  const actionTitle = String(formData.get("actionTitle") ?? "").trim()
  const actionBody = String(formData.get("actionBody") ?? "").trim()
  const conditionPriority = String(formData.get("conditionPriority") ?? "")
  const conditionDiscipline = String(formData.get("conditionDiscipline") ?? "")
  const conditionUnassigned = formData.get("conditionUnassigned") === "on"

  if (!slug || !projectId || !name || !triggerType || !actionType) {
    return { error: "Name, trigger, and action are required." }
  }

  if (triggerType === "task_status_changed" && !triggerStatus) {
    return { error: "Select the status that should trigger this rule." }
  }

  if (actionType === "set_task_status" && !actionStatus) {
    return { error: "Select the status to apply." }
  }

  if (actionType === "add_label" && !actionLabelId) {
    return { error: "Select a label to add." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be signed in." }
  }

  const triggerConfig =
    triggerType === "task_status_changed"
      ? { to_status: triggerStatus as TaskStatus }
      : {}

  const actionConfig =
    actionType === "set_task_status"
      ? { status: actionStatus as TaskStatus }
      : actionType === "add_label"
        ? { label_id: actionLabelId }
        : {
            ...(actionTitle ? { title: actionTitle } : {}),
            ...(actionBody ? { body: actionBody } : {}),
          }

  const { error } = await supabase.from("project_automations").insert({
    project_id: projectId,
    name,
    trigger_type: triggerType,
    trigger_config: triggerConfig,
    condition_priority: (conditionPriority || null) as TaskPriority | null,
    condition_discipline: (conditionDiscipline || null) as Discipline | null,
    condition_unassigned: conditionUnassigned,
    action_type: actionType,
    action_config: actionConfig,
    created_by: user.id,
  })

  if (error) {
    return { error: error.message }
  }

  revalidateAutomationPaths(slug)
  return { success: "Automation created." }
}

export async function toggleProjectAutomation(
  _prevState: AutomationActionState,
  formData: FormData
): Promise<AutomationActionState> {
  const slug = String(formData.get("slug") ?? "")
  const automationId = String(formData.get("automationId") ?? "")
  const enabled = String(formData.get("enabled") ?? "") === "true"

  if (!slug || !automationId) {
    return { error: "Automation is required." }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from("project_automations")
    .update({ enabled })
    .eq("id", automationId)

  if (error) {
    return { error: error.message }
  }

  revalidateAutomationPaths(slug)
  return { success: enabled ? "Automation enabled." : "Automation paused." }
}

export async function deleteProjectAutomation(
  _prevState: AutomationActionState,
  formData: FormData
): Promise<AutomationActionState> {
  const slug = String(formData.get("slug") ?? "")
  const automationId = String(formData.get("automationId") ?? "")

  if (!slug || !automationId) {
    return { error: "Automation is required." }
  }

  const supabase = await createClient()
  const { error } = await supabase.from("project_automations").delete().eq("id", automationId)

  if (error) {
    return { error: error.message }
  }

  revalidateAutomationPaths(slug)
  return { success: "Automation deleted." }
}
