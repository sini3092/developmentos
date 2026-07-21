"use client"

import { useActionState, useEffect } from "react"
import { useTheme } from "next-themes"
import { User } from "lucide-react"

import { updateAccountSettings } from "@/lib/actions/profile"
import type { Profile } from "@/lib/database.types"
import {
  DENSITY_PREFERENCES,
  DENSITY_PREFERENCE_LABELS,
  THEME_PREFERENCES,
  THEME_PREFERENCE_LABELS,
} from "@/lib/constants/preferences"
import { useUiStore } from "@/lib/stores/ui-store"
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

type AccountSettingsPanelProps = {
  email: string
  profile: Profile | null
}

export function AccountSettingsPanel({ email, profile }: AccountSettingsPanelProps) {
  const [state, formAction, pending] = useActionState(updateAccountSettings, {})
  const { setTheme } = useTheme()
  const setDensity = useUiStore((state) => state.setDensity)

  useEffect(() => {
    if (!state.success) {
      return
    }

    if (state.theme) {
      setTheme(state.theme)
    }

    if (state.density) {
      setDensity(state.density)
      document.documentElement.dataset.density = state.density
    }
  }, [state.success, state.theme, state.density, setDensity, setTheme])

  const themePreference = profile?.theme_preference ?? "system"
  const densityPreference = profile?.density_preference ?? "comfortable"

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <User className="size-4" />
          Account
        </CardTitle>
        <CardDescription>Profile, appearance, and interface density.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-5">
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
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              name="displayName"
              defaultValue={profile?.display_name ?? ""}
              placeholder="Your name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Theme</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {THEME_PREFERENCES.map((theme) => (
                <label
                  key={theme}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name="theme"
                    value={theme}
                    defaultChecked={themePreference === theme}
                    className="size-4"
                  />
                  {THEME_PREFERENCE_LABELS[theme]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Density</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {DENSITY_PREFERENCES.map((density) => (
                <label
                  key={density}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm"
                >
                  <input
                    type="radio"
                    name="density"
                    value={density}
                    defaultChecked={densityPreference === density}
                    className="size-4"
                  />
                  {DENSITY_PREFERENCE_LABELS[density]}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Compact tightens spacing and type scale across the shell.
            </p>
          </fieldset>
        </CardContent>
        <CardFooter className="justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save account settings"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
