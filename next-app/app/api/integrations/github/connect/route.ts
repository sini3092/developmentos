import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { randomBytes } from "crypto"

import { createClient } from "@/lib/supabase/server"
import { buildGithubAuthorizeUrl } from "@/lib/github/api"

const STATE_COOKIE = "github_oauth_state"

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL("/auth/sign-in?next=/settings", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"))
  }

  try {
    const state = randomBytes(24).toString("hex")
    const cookieStore = await cookies()
    cookieStore.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    })

    const authorizeUrl = buildGithubAuthorizeUrl(state)
    return NextResponse.redirect(authorizeUrl)
  } catch {
    return NextResponse.redirect(
      new URL("/settings?github=not_configured", process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
    )
  }
}
