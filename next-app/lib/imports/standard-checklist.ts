export const STANDARD_DEFINITION_CHECKLIST = [
  "Goal and player value are clear",
  "Scope is limited",
  "Dependencies are linked",
  "Relevant design document is linked",
] as const

export const STANDARD_IMPLEMENTATION_CHECKLIST = [
  "Data/resources created",
  "Core logic implemented",
  "UI/feedback implemented",
  "Audio implemented where required",
  "Save/load support implemented",
  "Error handling implemented",
] as const

export const STANDARD_VALIDATION_CHECKLIST = [
  "Tested in a fresh save",
  "Tested in an existing save",
  "Tested after loading",
  "Tested for edge cases",
  "Performance checked",
  "Acceptance criteria passed",
  "Documentation updated",
] as const

export function buildStandardChecklist() {
  return [
    ...STANDARD_DEFINITION_CHECKLIST.map((item) => `Definition: ${item}`),
    ...STANDARD_IMPLEMENTATION_CHECKLIST.map((item) => `Implementation: ${item}`),
    ...STANDARD_VALIDATION_CHECKLIST.map((item) => `Validation: ${item}`),
  ]
}
