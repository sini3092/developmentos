"use client"

import Link from "next/link"
import { useActionState } from "react"

import type { AuthActionState } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AuthFormProps = {
  title: string
  description: string
  action: (
    state: AuthActionState,
    formData: FormData
  ) => Promise<AuthActionState>
  submitLabel: string
  children: React.ReactNode
  footer?: React.ReactNode
  next?: string
}

export function AuthForm({
  title,
  description,
  action,
  submitLabel,
  children,
  footer,
  next,
}: AuthFormProps) {
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <Card className="w-full border-border/70 shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <form action={formAction}>
        {next ? <input type="hidden" name="next" value={next} /> : null}
        <CardContent className="space-y-4">
          {state.error ? (
            <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
              {state.success}
            </p>
          ) : null}
          {children}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Please wait..." : submitLabel}
          </Button>
          {footer}
        </CardFooter>
      </form>
    </Card>
  )
}

export function AuthField({
  id,
  label,
  type = "text",
  name,
  autoComplete,
  required = true,
  placeholder,
}: {
  id: string
  label: string
  type?: string
  name: string
  autoComplete?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
      />
    </div>
  )
}

export function AuthLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <p className="text-center text-sm text-muted-foreground">
      <Link
        href={href}
        className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
      >
        {children}
      </Link>
    </p>
  )
}

export function AuthNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-4 rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-center text-sm text-muted-foreground">
      {children}
    </p>
  )
}
