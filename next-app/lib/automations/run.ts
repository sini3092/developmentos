import type {
  AutomationActionType,
  AutomationTriggerType,
  Discipline,
  Json,
  Task,
  TaskPriority,
  TaskStatus,
} from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export type AutomationEvent = {
  trigger: AutomationTriggerType
  projectId: string
  projectSlug: string
  workspaceId: string
  task: Pick<
    Task,
    | "id"
    | "identifier"
    | "title"
    | "status"
    | "priority"
    | "discipline"
    | "assignee_id"
    | "project_id"
    | "workspace_id"
  >
  previousStatus?: TaskStatus | null
  previousAssigneeId?: string | null
}

type AutomationRow = {
  id: string
  trigger_type: AutomationTriggerType
  trigger_config: Json
  condition_priority: TaskPriority | null
  condition_discipline: Discipline | null
  condition_unassigned: boolean
  action_type: AutomationActionType
  action_config: Json
}

let automationDepth = 0
const MAX_AUTOMATION_DEPTH = 3

function asRecord(value: Json): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function matchesTrigger(automation: AutomationRow, event: AutomationEvent) {
  if (automation.trigger_type !== event.trigger) {
    return false
  }

  if (event.trigger === "task_status_changed") {
    const toStatus = asRecord(automation.trigger_config).to_status as TaskStatus | undefined
    if (!toStatus || toStatus !== event.task.status) {
      return false
    }
    if (event.previousStatus === event.task.status) {
      return false
    }
  }

  if (event.trigger === "task_assigned") {
    if (!event.task.assignee_id) {
      return false
    }
    if (event.previousAssigneeId === event.task.assignee_id) {
      return false
    }
  }

  return true
}

function matchesConditions(automation: AutomationRow, event: AutomationEvent) {
  if (automation.condition_unassigned && event.task.assignee_id) {
    return false
  }

  if (automation.condition_priority && event.task.priority !== automation.condition_priority) {
    return false
  }

  if (automation.condition_discipline && event.task.discipline !== automation.condition_discipline) {
    return false
  }

  return true
}

async function executeAction(
  automation: AutomationRow,
  event: AutomationEvent
) {
  const supabase = await createClient()
  const actionConfig = asRecord(automation.action_config)
  const taskLink = `/projects/${event.projectSlug}/tasks?task=${event.task.id}`

  if (automation.action_type === "notify_assignee") {
    if (!event.task.assignee_id) {
      return
    }

    const title =
      (typeof actionConfig.title === "string" && actionConfig.title.trim()) ||
      `Automation: ${event.task.identifier}`
    const body =
      (typeof actionConfig.body === "string" && actionConfig.body.trim()) || event.task.title

    await supabase.rpc("create_automation_notification", {
      p_workspace_id: event.workspaceId,
      p_user_id: event.task.assignee_id,
      p_title: title,
      p_body: body,
      p_link: taskLink,
      p_entity_id: event.task.id,
    })
    return
  }

  if (automation.action_type === "set_task_status") {
    const status = actionConfig.status as TaskStatus | undefined
    if (!status || status === event.task.status) {
      return
    }

    await supabase.from("tasks").update({ status }).eq("id", event.task.id)
    return
  }

  if (automation.action_type === "add_label") {
    const labelId = actionConfig.label_id as string | undefined
    if (!labelId) {
      return
    }

    await supabase.from("task_labels").upsert(
      {
        task_id: event.task.id,
        label_id: labelId,
      },
      { onConflict: "task_id,label_id", ignoreDuplicates: true }
    )
  }
}

export async function runProjectAutomations(event: AutomationEvent) {
  if (automationDepth >= MAX_AUTOMATION_DEPTH) {
    return
  }

  automationDepth += 1
  try {
    const supabase = await createClient()
    const { data: automations } = await supabase
      .from("project_automations")
      .select(
        "id, trigger_type, trigger_config, condition_priority, condition_discipline, condition_unassigned, action_type, action_config"
      )
      .eq("project_id", event.projectId)
      .eq("enabled", true)

    for (const automation of automations ?? []) {
      if (!matchesTrigger(automation, event) || !matchesConditions(automation, event)) {
        continue
      }

      await executeAction(automation, event)
    }
  } finally {
    automationDepth -= 1
  }
}

export async function dispatchAutomationEvents(events: AutomationEvent[]) {
  for (const event of events) {
    await runProjectAutomations(event)
  }
}
