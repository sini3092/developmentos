"use server"

import { revalidatePath } from "next/cache"

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
  const { error } = await supabase.from("notifications").delete().eq("id", notificationId)

  if (error) {
    return { error: error.message }
  }

  revalidateInbox()
  return { success: true }
}
