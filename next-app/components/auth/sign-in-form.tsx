"use client"

import { AuthField, AuthForm, AuthLink, AuthNotice } from "@/components/auth/auth-form"
import { signIn } from "@/lib/actions/auth"

type SignInFormProps = {
  next?: string
  notice?: string
}

export function SignInForm({ next, notice }: SignInFormProps) {
  return (
    <>
      {notice === "registration_disabled" ? (
        <AuthNotice>
          Registration is closed. Sign in with the account your workspace owner created for
          you.
        </AuthNotice>
      ) : null}
      <AuthForm
        title="Sign in"
        description="Welcome back."
        action={signIn}
        submitLabel="Sign in"
        next={next}
        footer={<AuthLink href="/auth/forgot-password">Forgot your password?</AuthLink>}
      >
        <AuthField
          id="email"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@studio.com"
        />
        <AuthField
          id="password"
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
        />
      </AuthForm>
    </>
  )
}
