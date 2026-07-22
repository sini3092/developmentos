import { NextResponse } from "next/server"

import { deliverCalendarReminders } from "@/lib/calendar/deliver-reminders"
import { isAdminClientConfigured } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  if (!isAdminClientConfigured()) {
    return NextResponse.json({ error: "Admin client is not configured." }, { status: 503 })
  }

  const secret = process.env.CRON_SECRET ?? process.env.PUSH_DELIVERY_SECRET
  if (secret) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }
  }

  try {
    const result = await deliverCalendarReminders()
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Calendar reminder delivery failed."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
