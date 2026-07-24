export type InboxThreadKind = "souls_report" | "direct"

export type InboxSenderKind = "user" | "souls" | "system" | "peer"

export type InboxMessageStatus = "pending" | "working" | "complete" | "error"

export type SoulsReportMetadata = {
  commit_sha?: string
  branch?: string
  status_path?: string
  outcome?: string
  tasks_updated?: number
  tasks_created?: number
  comments_added?: number
  checklist_updates?: number
  list_moves?: number
  lore_entries_enriched?: number
}

export type InboxThread = {
  id: string
  workspace_id: string
  kind: InboxThreadKind
  project_id: string | null
  title: string
  direct_peer_a: string | null
  direct_peer_b: string | null
  souls_report_number: number | null
  metadata: SoulsReportMetadata & Record<string, unknown>
  last_message_at: string
  archived_at: string | null
  created_at: string
  updated_at: string
}

export type InboxMessage = {
  id: string
  thread_id: string
  sender_kind: InboxSenderKind
  sender_user_id: string | null
  body: string
  metadata: Record<string, unknown>
  status: InboxMessageStatus
  created_at: string
}

export type InboxThreadListItem = InboxThread & {
  preview: string
  unread: boolean
  peer_name?: string | null
  peer_id?: string | null
  project_slug?: string | null
  project_name?: string | null
}
