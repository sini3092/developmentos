"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"

import { completeProfileSetup } from "@/lib/actions/profile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function ProfileSetupForm() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState(completeProfileSetup, {})

  if (state.success) {
    router.replace("/")
    router.refresh()
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-border/70 bg-card p-6 shadow-lg">
      <div className="mb-6 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Set up your profile</h1>
        <p className="text-sm text-muted-foreground">
          Pick a nickname your teammate will recognize. Avatar is optional.
        </p>
      </div>

      <form action={formAction} className="space-y-4">
        {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
        <div className="space-y-2">
          <Label htmlFor="displayName">Nickname</Label>
          <Input
            id="displayName"
            name="displayName"
            placeholder="e.g. Alex"
            required
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="avatarUrl">Avatar URL (optional)</Label>
          <Input
            id="avatarUrl"
            name="avatarUrl"
            type="url"
            placeholder="https://..."
          />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving..." : "Continue to workspace"}
        </Button>
      </form>
    </div>
  )
}
