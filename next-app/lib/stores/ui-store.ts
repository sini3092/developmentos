import { create } from "zustand"

type UiState = {
  commandPaletteOpen: boolean
  density: "comfortable" | "compact"
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void
  setDensity: (density: "comfortable" | "compact") => void
}

export const useUiStore = create<UiState>((set) => ({
  commandPaletteOpen: false,
  density: "comfortable",
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setDensity: (density) => set({ density }),
}))
