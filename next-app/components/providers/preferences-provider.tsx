"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

import { useWorkspace } from "@/components/providers/workspace-provider"
import { useUiStore } from "@/lib/stores/ui-store"

export function PreferencesProvider() {
  const { profile } = useWorkspace()
  const { setTheme } = useTheme()
  const setDensity = useUiStore((state) => state.setDensity)

  useEffect(() => {
    if (!profile) {
      return
    }

    if (profile.theme_preference) {
      setTheme(profile.theme_preference)
    }

    if (profile.density_preference) {
      setDensity(profile.density_preference)
      document.documentElement.dataset.density = profile.density_preference
    }
  }, [profile, setDensity, setTheme])

  return null
}
