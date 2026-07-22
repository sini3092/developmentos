import { create } from "zustand"

type UiState = {
  commandPaletteOpen: boolean
  soulsPanelOpen: boolean
  soulsAttachLoreSlug: string | null
  density: "comfortable" | "compact"
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void
  setSoulsPanelOpen: (open: boolean) => void
  toggleSoulsPanel: () => void
  setSoulsAttachLoreSlug: (slug: string | null) => void
  setDensity: (density: "comfortable" | "compact") => void
}

export const useUiStore = create<UiState>((set) => ({
  commandPaletteOpen: false,
  soulsPanelOpen: false,
  soulsAttachLoreSlug: null,
  density: "comfortable",
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () =>
    set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
  setSoulsPanelOpen: (open) => set({ soulsPanelOpen: open }),
  toggleSoulsPanel: () => set((state) => ({ soulsPanelOpen: !state.soulsPanelOpen })),
  setSoulsAttachLoreSlug: (slug) => set({ soulsAttachLoreSlug: slug }),
  setDensity: (density) => set({ density }),
}))
