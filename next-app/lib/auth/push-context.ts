import type { NotificationPreferences } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export async function getNotificationPreferences(userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()

  return data as NotificationPreferences | null
}

export async function getPushSubscriptionCount(userId: string) {
  const supabase = await createClient()
  const { count } = await supabase
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)

  return count ?? 0
}
