import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { isPublicSignUpEnabled } from "@/lib/auth/registration-policy"

const AUTH_ROUTES = ["/auth/sign-in", "/auth/sign-up", "/auth/forgot-password"]
const PUBLIC_PREFIXES = ["/auth", "/invite"]
const ONBOARDING_PREFIXES = ["/onboarding"]

function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isAuthRoute(pathname: string) {
  return AUTH_ROUTES.some((route) => pathname === route)
}

function isOnboardingPath(pathname: string) {
  return ONBOARDING_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value)
          )
        },
      },
    }
  )

  const { data } = await supabase.auth.getClaims()
  const isAuthenticated = Boolean(data?.claims?.sub)
  const pathname = request.nextUrl.pathname

  if (pathname === "/auth/sign-up" && !isPublicSignUpEnabled()) {
    const signInUrl = request.nextUrl.clone()
    signInUrl.pathname = "/auth/sign-in"
    signInUrl.searchParams.set("notice", "registration_disabled")
    signInUrl.searchParams.delete("next")
    return NextResponse.redirect(signInUrl)
  }

  if (!isAuthenticated && !isPublicPath(pathname) && !isOnboardingPath(pathname)) {
    const signInUrl = request.nextUrl.clone()
    signInUrl.pathname = "/auth/sign-in"
    signInUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(signInUrl)
  }

  if (isAuthenticated && isAuthRoute(pathname)) {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = "/"
    homeUrl.search = ""
    return NextResponse.redirect(homeUrl)
  }

  return supabaseResponse
}
