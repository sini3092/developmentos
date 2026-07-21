"use client"

import { AuthField, AuthForm, AuthNotice } from "@/components/auth/auth-form"
import { changePassword, signOut } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"

type ChangePasswordFormProps = {
  mode: "required" | "recovery"
  title: string
  description: string
  notice?: string
}

export function ChangePasswordForm({
  mode,
  title,
  description,
  notice,
}: ChangePasswordFormProps) {
  return (
    <div className="space-y-4">
      {notice ? <AuthNotice>{notice}</AuthNotice> : null}
      <AuthForm
        title={title}
        description={description}
        action={changePassword}
        submitLabel="Save new password"
      >
        <input type="hidden" name="mode" value={mode} />
        <AuthField
          id="newPassword"
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
        />
        <AuthField
          id="confirmPassword"
          label="Confirm new password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Repeat new password"
        />
      </AuthForm>
      <form action={signOut}>
        <Button type="submit" variant="ghost" className="w-full">
          Sign out
        </Button>
      </form>
    </div>
  )
}
