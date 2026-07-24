"use server"

import { revalidatePath } from "next/cache"

import { archiveInboxThread } from "@/lib/inbox/threads"
import { createClient } from "@/lib/supabase/server"

export type NotificationActionState = {
  error?: string
  success?: string
}

function revalidateInbox() {
  revalidatePath("/")
  revalidatePath("/inbox")
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)

  if (error) {
    return { error: error.message }
  }

  revalidateInbox()
  return { success: true }
}

export async function markAllNotificationsRead(workspaceId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .is("read_at", null)

  if (error) {
    return { error: error.message }
  }

  revalidateInbox()
  return { success: true }
}

export async function dismissNotification(notificationId: string) {
  const supabase = await createClient()

  const { data: notification } = await supabase
    .from("notifications")
    .select("entity_type, entity_id")
    .eq("id", notificationId)
    .maybeSingle()

  if (notification?.entity_type === "inbox_thread" && notification.entity_id) {
    await archiveInboxThread(supabase, notification.entity_id)
  }

  const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

  if (error) {
    return { error: error.message }
  }

  revalidateInbox()
  return { success: true }
}
