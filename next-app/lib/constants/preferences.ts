import type { DensityPreference, ThemePreference } from "@/lib/database.types"

export const THEME_PREFERENCES: ThemePreference[] = ["light", "dark", "system"]

export const THEME_PREFERENCE_LABELS: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
}

export const DENSITY_PREFERENCES: DensityPreference[] = ["comfortable", "compact"]

export const DENSITY_PREFERENCE_LABELS: Record<DensityPreference, string> = {
  comfortable: "Comfortable",
  compact: "Compact",
}
