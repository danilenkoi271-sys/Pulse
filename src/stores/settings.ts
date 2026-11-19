import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Bump when the Terms / Risk text changes materially to re-prompt users. */
export const TERMS_VERSION = 1

interface SettingsState {
  acceptedTerms: number
  accept: () => void
}

export const useSettings = create<SettingsState>()(
  persist((set) => ({ acceptedTerms: 0, accept: () => set({ acceptedTerms: TERMS_VERSION }) }), { name: 'pulse:settings' }),
)
