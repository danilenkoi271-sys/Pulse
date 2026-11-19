import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface FavState {
  favs: string[]
  toggle: (key: string) => void
}

export const useFavorites = create<FavState>()(
  persist(
    (set, get) => ({
      favs: ['BTC', 'ETH', 'SOL'],
      toggle: (key) => set({ favs: get().favs.includes(key) ? get().favs.filter((k) => k !== key) : [...get().favs, key] }),
    }),
    { name: 'pulse:favorites' },
  ),
)
