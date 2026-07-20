import type { AutomationActionType, AutomationTriggerType } from "@/lib/database.types"
import {
  DISCIPLINE_LABELS,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants/tasks"

export const AUTOMATION_TRIGGER_TYPES: AutomationTriggerType[] = [
  "task_created",
  "task_status_changed",
  "task_assigned",
]

export const AUTOMATION_ACTION_TYPES: AutomationActionType[] = [
  "notify_assignee",
  "set_task_status",
  "add_label",
]

export const AUTOMATION_TRIGGER_LABELS: Record<AutomationTriggerType, string> = {
  task_created: "Task created",
  task_status_changed: "Task status changed",
  task_assigned: "Task assigned",
}

export const AUTOMATION_ACTION_LABELS: Record<AutomationActionType, string> = {
  notify_assignee: "Notify assignee",
  set_task_status: "Set task status",
  add_label: "Add label",
}

export function describeAutomationRule(input: {
  trigger_type: AutomationTriggerType
  trigger_config: Record<string, unknown>
  condition_priority?: string | null
  condition_discipline?: string | null
  condition_unassigned?: boolean
  action_type: AutomationActionType
  action_config: Record<string, unknown>
}) {
  const triggerStatus = input.trigger_config.to_status as string | undefined
  const trigger =
    input.trigger_type === "task_status_changed" && triggerStatus
      ? `Status becomes ${TASK_STATUS_LABELS[triggerStatus as keyof typeof TASK_STATUS_LABELS] ?? triggerStatus}`
      : AUTOMATION_TRIGGER_LABELS[input.trigger_type]

  const conditions: string[] = []
  if (input.condition_unassigned) {
    conditions.push("unassigned")
  }
  if (input.condition_priority) {
    conditions.push(
      `priority is ${TASK_PRIORITY_LABELS[input.condition_priority as keyof typeof TASK_PRIORITY_LABELS] ?? input.condition_priority}`
    )
  }
  if (input.condition_discipline) {
    conditions.push(
      `discipline is ${DISCIPLINE_LABELS[input.condition_discipline as keyof typeof DISCIPLINE_LABELS] ?? input.condition_discipline}`
    )
  }

  const actionStatus = input.action_config.status as string | undefined
  const action =
    input.action_type === "set_task_status" && actionStatus
      ? `Set status to ${TASK_STATUS_LABELS[actionStatus as keyof typeof TASK_STATUS_LABELS] ?? actionStatus}`
      : AUTOMATION_ACTION_LABELS[input.action_type]

  const conditionText = conditions.length > 0 ? ` when ${conditions.join(", ")}` : ""
  return `When ${trigger.toLowerCase()}${conditionText} → ${action}`
}
