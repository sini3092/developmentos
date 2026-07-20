"use server"

import { revalidatePath } from "next/cache"

import type { DensityPreference, ThemePreference } from "@/lib/database.types"
import { createClient } from "@/lib/supabase/server"

export type ProfileActionState = {
  error?: string
  success?: string
  theme?: ThemePreference
  density?: DensityPreference
}

const THEME_VALUES = new Set<ThemePreference>(["light", "dark", "system"])
const DENSITY_VALUES = new Set<DensityPreference>(["comfortable", "compact"])

export async function updateAccountSettings(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const displayName = String(formData.get("displayName") ?? "").trim()
  const theme = String(formData.get("theme") ?? "system") as ThemePreference
  const density = String(formData.get("density") ?? "comfortable") as DensityPreference

  if (!displayName) {
    return { error: "Display name is required." }
  }

  if (!THEME_VALUES.has(theme)) {
    return { error: "Invalid theme preference." }
  }

  if (!DENSITY_VALUES.has(density)) {
    return { error: "Invalid density preference." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      theme_preference: theme,
      density_preference: density,
    })
    .eq("id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/settings")
  revalidatePath("/")
  return { success: "Account settings saved.", theme, density }
}

export async function completeProfileSetup(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const displayName = String(formData.get("displayName") ?? "").trim()
  const avatarUrl = String(formData.get("avatarUrl") ?? "").trim()

  if (!displayName) {
    return { error: "Choose a nickname to continue." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated." }
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      avatar_url: avatarUrl || null,
    })
    .eq("id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/")
  return { success: "Profile saved." }
}
