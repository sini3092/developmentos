"use client"

import { useActionState } from "react"
import { KeyRound } from "lucide-react"

import { changePassword } from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function PasswordSettingsPanel() {
  const [state, formAction, pending] = useActionState(changePassword, {})

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" />
          Password
        </CardTitle>
        <CardDescription>Change your sign-in password.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <input type="hidden" name="mode" value="settings" />
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
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current password</Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
            />
          </div>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            Update password
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
