import webpush from "web-push"

import type { Notification, NotificationPreferences, NotificationType } from "@/lib/database.types"
import { createAdminClient } from "@/lib/supabase/admin"
import { getVapidSubject, isPushConfigured } from "@/lib/push/vapid"

type PushSubscriptionRow = {
  endpoint: string
  p256dh: string
  auth: string
}

function isTypeEnabled(
  type: NotificationType,
  prefs: NotificationPreferences | null
): boolean {
  if (!prefs?.push_enabled) {
    return false
  }

  switch (type) {
    case "task_assigned":
      return prefs.push_task_assigned
    case "task_comment":
      return prefs.push_task_comment
    case "task_blocked":
      return prefs.push_task_blocked
    case "roadmap_update":
      return prefs.push_roadmap_update
    case "mentioned":
      return prefs.push_mentioned
    default:
      return false
  }
}

function configureWebPush() {
  webpush.setVapidDetails(
    getVapidSubject(),
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  )
}

export async function sendPushForNotification(notification: Notification) {
  if (!isPushConfigured()) {
    return { sent: 0, skipped: true }
  }

  const admin = createAdminClient()

  const { data: prefs } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", notification.user_id)
    .maybeSingle()

  if (!isTypeEnabled(notification.type, prefs)) {
    return { sent: 0, skipped: true }
  }

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", notification.user_id)

  if (!subscriptions?.length) {
    return { sent: 0, skipped: true }
  }

  configureWebPush()

  const payload = JSON.stringify({
    title: notification.title,
    body: notification.body,
    url: notification.link ?? "/inbox",
    tag: notification.id,
  })

  let sent = 0
  const staleEndpoints: string[] = []

  await Promise.all(
    (subscriptions as PushSubscriptionRow[]).map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          payload
        )
        sent += 1
      } catch (error) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode: number }).statusCode)
            : 0

        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(sub.endpoint)
        }
      }
    })
  )

  if (staleEndpoints.length > 0) {
    await admin
      .from("push_subscriptions")
      .delete()
      .eq("user_id", notification.user_id)
      .in("endpoint", staleEndpoints)
  }

  return { sent, skipped: false }
}

export async function processPushQueue(limit = 50) {
  if (!isPushConfigured()) {
    return { processed: 0, sent: 0 }
  }

  const admin = createAdminClient()

  const { data: queueItems } = await admin
    .from("push_notification_queue")
    .select("id, notification_id")
    .is("delivered_at", null)
    .order("created_at", { ascending: true })
    .limit(limit)

  if (!queueItems?.length) {
    return { processed: 0, sent: 0 }
  }

  let sent = 0

  for (const item of queueItems) {
    const { data: notification } = await admin
      .from("notifications")
      .select("*")
      .eq("id", item.notification_id)
      .maybeSingle()

    if (!notification) {
      await admin
        .from("push_notification_queue")
        .update({ delivered_at: new Date().toISOString() })
        .eq("id", item.id)
      continue
    }

    const result = await sendPushForNotification(notification)
    if (result.sent > 0) {
      sent += result.sent
    }

    await admin
      .from("push_notification_queue")
      .update({ delivered_at: new Date().toISOString() })
      .eq("id", item.id)
  }

  return { processed: queueItems.length, sent }
}
