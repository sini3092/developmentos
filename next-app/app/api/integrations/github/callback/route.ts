import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { exchangeGithubCode, getGithubUser } from "@/lib/github/api"

const STATE_COOKIE = "github_oauth_state"

export async function GET(request: Request) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const { searchParams } = new URL(request.url)
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const cookieStore = await cookies()
  const savedState = cookieStore.get(STATE_COOKIE)?.value

  cookieStore.delete(STATE_COOKIE)

  if (!code || !state || !savedState || state !== savedState) {
    return NextResponse.redirect(`${siteUrl}/settings?github=error`)
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${siteUrl}/auth/sign-in?next=/settings`)
  }

  try {
    const token = await exchangeGithubCode(code)
    const githubUser = await getGithubUser(token.access_token)

    const { error } = await supabase.from("github_connections").upsert(
      {
        user_id: user.id,
        github_user_id: githubUser.id,
        github_username: githubUser.login,
        access_token: token.access_token,
        scope: token.scope,
      },
      { onConflict: "user_id" }
    )

    if (error) {
      return NextResponse.redirect(`${siteUrl}/settings?github=error`)
    }

    return NextResponse.redirect(`${siteUrl}/settings?github=connected`)
  } catch {
    return NextResponse.redirect(`${siteUrl}/settings?github=error`)
  }
}
