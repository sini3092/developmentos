import type { Notification, Profile } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export type NotificationWithActor = Notification & {
  actor: Profile | null
}

export async function getUnreadNotificationCount(workspaceId: string, userId: string) {
  const supabase = await createClient()
  const { count } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .is("read_at", null)

  return count ?? 0
}

export async function getNotifications(workspaceId: string, userId: string) {
  const supabase = await createClient()
  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50)

  return notifications ?? []
}
