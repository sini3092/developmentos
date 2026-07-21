"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { isPublicSignUpEnabled } from "@/lib/auth/registration-policy"
import { createClient } from "@/lib/supabase/server"

export type AuthActionState = {
  error?: string
  success?: string
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const next = String(formData.get("next") ?? "/")

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  if (data.user?.user_metadata?.must_change_password === true) {
    redirect("/auth/change-password")
  }

  redirect(next.startsWith("/") ? next : "/")
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  if (!isPublicSignUpEnabled()) {
    return {
      error: "Public registration is disabled. Ask your workspace owner for an account.",
    }
  }

  const displayName = String(formData.get("displayName") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!displayName || !email || !password) {
    return { error: "All fields are required." }
  }

  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  })

  if (error) {
    return { error: error.message }
  }

  return {
    success:
      "Account created. Check your email to confirm your address, then sign in.",
  }
}

export async function resetPassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim()

  if (!email) {
    return { error: "Email is required." }
  }

  const supabase = await createClient()
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/change-password`,
  })

  if (error) {
    return { error: error.message }
  }

  return { success: "Password reset instructions sent to your email." }
}

export async function changePassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const mode = String(formData.get("mode") ?? "settings")
  const currentPassword = String(formData.get("currentPassword") ?? "")
  const newPassword = String(formData.get("newPassword") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  if (!newPassword || !confirmPassword) {
    return { error: "All password fields are required." }
  }

  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters." }
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user?.email) {
    return { error: "You must be signed in." }
  }

  if (mode === "settings") {
    if (!currentPassword) {
      return { error: "Current password is required." }
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (verifyError) {
      return { error: "Current password is incorrect." }
    }
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
    data: { must_change_password: false },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")

  if (mode === "required" || mode === "recovery") {
    redirect("/")
  }

  return { success: "Password updated." }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/sign-in")
}
