"use client"

import { AuthField, AuthForm, AuthLink } from "@/components/auth/auth-form"
import { resetPassword } from "@/lib/actions/auth"

export function ForgotPasswordForm() {
  return (
    <AuthForm
      title="Reset password"
      description="Enter your email and we'll send you a link to choose a new password."
      action={resetPassword}
      submitLabel="Send reset link"
      footer={<AuthLink href="/auth/sign-in">Back to sign in</AuthLink>}
    >
      <AuthField
        id="email"
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@studio.com"
      />
    </AuthForm>
  )
}
