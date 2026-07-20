import type { TaskReferenceType } from "@/lib/database.types"

export const TASK_REFERENCE_TYPES: TaskReferenceType[] = [
  "design_document",
  "lore_entry",
]

export const TASK_REFERENCE_TYPE_LABELS: Record<TaskReferenceType, string> = {
  design_document: "Design doc",
  lore_entry: "Lore entry",
}
