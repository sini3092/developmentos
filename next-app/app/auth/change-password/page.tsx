import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

import { ChangePasswordForm } from "@/components/auth/change-password-form"

export default async function ChangePasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/sign-in?next=/auth/change-password")
  }

  const mustChange = user.user_metadata?.must_change_password === true

  if (mustChange) {
    return (
      <ChangePasswordForm
        mode="required"
        title="Choose a new password"
        description="Your account was created with a temporary password. Set your own password to continue."
        notice="You need to change your password before using the app."
      />
    )
  }

  return (
    <ChangePasswordForm
      mode="recovery"
      title="Set a new password"
      description="Choose a new password for your account."
    />
  )
}
