export type SearchResultType =
  | "task"
  | "project"
  | "initiative"
  | "milestone"
  | "member"
  | "design"
  | "lore"
  | "channel"
  | "asset"
  | "decision"
  | "all"

export type SearchResult = {
  id: string
  type: Exclude<SearchResultType, "all">
  title: string
  subtitle: string
  href: string
}

const TYPE_LABELS: Record<Exclude<SearchResultType, "all">, string> = {
  task: "Task",
  project: "Project",
  initiative: "Initiative",
  milestone: "Milestone",
  member: "Member",
  design: "Design doc",
  lore: "Lore",
  channel: "Channel",
  asset: "Asset",
  decision: "Decision",
}

export function getSearchTypeLabel(type: Exclude<SearchResultType, "all">) {
  return TYPE_LABELS[type]
}
