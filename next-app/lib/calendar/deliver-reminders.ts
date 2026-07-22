import { createAdminClient, isAdminClientConfigured } from "@/lib/supabase/admin"
import { processPushQueue } from "@/lib/push/send"

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

export async function deliverCalendarReminders(options?: {
  date?: string
  eventId?: string
}) {
  if (!isAdminClientConfigured()) {
    return { delivered: 0, skipped: true }
  }

  const admin = createAdminClient()
  const onDate = options?.date ?? todayDateString()

  let query = admin
    .from("calendar_events")
    .select("id, workspace_id, user_id, title, description, event_date")
    .eq("event_date", onDate)
    .eq("notify_on_day", true)
    .is("reminded_at", null)

  if (options?.eventId) {
    query = query.eq("id", options.eventId)
  }

  const { data: events, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  if (!events?.length) {
    return { delivered: 0, skipped: false }
  }

  const remindedAt = new Date().toISOString()

  for (const event of events) {
    const monthParam = event.event_date.slice(0, 7)

    const { error: notificationError } = await admin.from("notifications").insert({
      workspace_id: event.workspace_id,
      user_id: event.user_id,
      type: "calendar_reminder",
      title: event.title,
      body: event.description?.trim() || "Scheduled for today on your calendar.",
      link: `/calendar?month=${monthParam}`,
      entity_type: "calendar_event",
      entity_id: event.id,
    })

    if (notificationError) {
      throw new Error(notificationError.message)
    }

    const { error: updateError } = await admin
      .from("calendar_events")
      .update({ reminded_at: remindedAt })
      .eq("id", event.id)

    if (updateError) {
      throw new Error(updateError.message)
    }
  }

  await processPushQueue()

  return { delivered: events.length, skipped: false }
}
