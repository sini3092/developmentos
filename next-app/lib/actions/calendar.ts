"use server"

import { revalidatePath } from "next/cache"

import { deliverCalendarReminders } from "@/lib/calendar/deliver-reminders"
import { createClient } from "@/lib/supabase/server"

export type CalendarActionState = {
  error?: string
  success?: string
  eventId?: string
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10)
}

async function maybeDeliverTodayReminder(eventId: string, eventDate: string, notifyOnDay: boolean) {
  if (!notifyOnDay || eventDate !== todayDateString()) {
    return
  }

  await deliverCalendarReminders({ eventId })
}

export async function createCalendarEvent(
  _prevState: CalendarActionState,
  formData: FormData
): Promise<CalendarActionState> {
  const workspaceId = String(formData.get("workspaceId") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const eventDate = String(formData.get("eventDate") ?? "")
  const notifyOnDay = formData.get("notifyOnDay") === "on"

  if (!workspaceId || !title || !eventDate) {
    return { error: "Title and date are required." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      workspace_id: workspaceId,
      user_id: user.id,
      title,
      description: description || null,
      event_date: eventDate,
      notify_on_day: notifyOnDay,
    })
    .select("id, event_date, notify_on_day")
    .single()

  if (error) {
    return { error: error.message }
  }

  await maybeDeliverTodayReminder(data.id, data.event_date, data.notify_on_day)

  revalidatePath("/calendar")
  revalidatePath("/inbox")

  return { success: "Calendar item added.", eventId: data.id }
}

export async function updateCalendarEvent(
  _prevState: CalendarActionState,
  formData: FormData
): Promise<CalendarActionState> {
  const eventId = String(formData.get("eventId") ?? "")
  const title = String(formData.get("title") ?? "").trim()
  const description = String(formData.get("description") ?? "").trim()
  const eventDate = String(formData.get("eventDate") ?? "")
  const notifyOnDay = formData.get("notifyOnDay") === "on"

  if (!eventId || !title || !eventDate) {
    return { error: "Title and date are required." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { data: existing } = await supabase
    .from("calendar_events")
    .select("event_date, reminded_at")
    .eq("id", eventId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (!existing) {
    return { error: "Calendar item not found." }
  }

  const shouldResetReminder =
    existing.event_date !== eventDate || (notifyOnDay && existing.reminded_at)

  const { data, error } = await supabase
    .from("calendar_events")
    .update({
      title,
      description: description || null,
      event_date: eventDate,
      notify_on_day: notifyOnDay,
      reminded_at: shouldResetReminder ? null : existing.reminded_at,
    })
    .eq("id", eventId)
    .eq("user_id", user.id)
    .select("id, event_date, notify_on_day")
    .single()

  if (error) {
    return { error: error.message }
  }

  await maybeDeliverTodayReminder(data.id, data.event_date, data.notify_on_day)

  revalidatePath("/calendar")
  revalidatePath("/inbox")

  return { success: "Calendar item updated.", eventId: data.id }
}

export async function deleteCalendarEvent(eventId: string): Promise<CalendarActionState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { error } = await supabase
    .from("calendar_events")
    .delete()
    .eq("id", eventId)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/calendar")
  return { success: "Calendar item deleted." }
}
