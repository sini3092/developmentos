import { NextResponse } from "next/server"

import { processPushQueue } from "@/lib/push/send"
import { isPushConfigured } from "@/lib/push/vapid"
import { isAdminClientConfigured } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  if (!isPushConfigured() || !isAdminClientConfigured()) {
    return NextResponse.json({ error: "Push is not configured." }, { status: 503 })
  }

  const secret = process.env.PUSH_DELIVERY_SECRET
  if (secret) {
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
    }
  }

  try {
    const result = await processPushQueue()
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Push delivery failed."
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
