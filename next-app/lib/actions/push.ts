"use server"

import { revalidatePath } from "next/cache"

import { createClient } from "@/lib/supabase/server"
import type { NotificationPreferences } from "@/lib/database.types"

export type PushActionState = {
  error?: string
  success?: string
}

export async function savePushSubscription(
  subscriptionJson: string,
  userAgent?: string
): Promise<PushActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  let subscription: {
    endpoint: string
    keys: { p256dh: string; auth: string }
  }

  try {
    subscription = JSON.parse(subscriptionJson) as typeof subscription
  } catch {
    return { error: "Invalid subscription payload." }
  }

  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { error: "Incomplete subscription payload." }
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: userAgent ?? null,
    },
    { onConflict: "user_id,endpoint" }
  )

  if (error) {
    return { error: error.message }
  }

  const { data: existingPrefs } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!existingPrefs) {
    await supabase.from("notification_preferences").insert({ user_id: user.id })
  }

  revalidatePath("/settings")
  return { success: "Push notifications enabled." }
}

export async function removePushSubscription(endpoint: string): Promise<PushActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", endpoint)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: "Push notifications disabled." }
}

export async function updateNotificationPreferences(
  _prevState: PushActionState,
  formData: FormData
): Promise<PushActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const prefs: Partial<NotificationPreferences> = {
    push_enabled: formData.get("push_enabled") === "on",
    push_task_assigned: formData.get("push_task_assigned") === "on",
    push_task_comment: formData.get("push_task_comment") === "on",
    push_task_blocked: formData.get("push_task_blocked") === "on",
    push_roadmap_update: formData.get("push_roadmap_update") === "on",
    push_mentioned: formData.get("push_mentioned") === "on",
    push_calendar_reminder: formData.get("push_calendar_reminder") === "on",
  }

  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      ...prefs,
    },
    { onConflict: "user_id" }
  )

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  return { success: "Notification preferences saved." }
}
