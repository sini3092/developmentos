import { NextResponse } from "next/server"

import { getVapidPublicKey, isPushConfigured } from "@/lib/push/vapid"

export async function GET() {
  if (!isPushConfigured()) {
    return NextResponse.json({ configured: false })
  }

  return NextResponse.json({
    configured: true,
    publicKey: getVapidPublicKey(),
  })
}
