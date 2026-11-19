import { create } from 'zustand'

export interface PendingOrder {
  id: string // cloid
  label: string
  side: 'buy' | 'sell'
  size: string
  price: string
  kind: 'market' | 'limit' | 'close'
  status: 'pending' | 'confirmed' | 'rejected'
  detail?: string
  ts: number
}

interface PendingState {
  items: PendingOrder[]
  add: (o: Omit<PendingOrder, 'status' | 'ts'>) => void
  resolve: (id: string, status: 'confirmed' | 'rejected', detail?: string) => void
  dismiss: (id: string) => void
}

/**
 * Optimistic order lifecycle: an order appears as "pending" the moment the user confirms it, then flips
 * to confirmed/rejected when Hyperliquid answers. Confirmed rows disappear once the real open order /
 * fill shows up over the WebSocket; rejected rows stay until dismissed so the reason is never missed.
 */
export const usePending = create<PendingState>((set, get) => ({
  items: [],
  add: (o) => set({ items: [{ ...o, status: 'pending' as const, ts: Date.now() }, ...get().items].slice(0, 20) }),
  resolve(id, status, detail) {
    set({ items: get().items.map((i) => (i.id === id ? { ...i, status, detail } : i)) })
    if (status === 'confirmed') setTimeout(() => get().dismiss(id), 4000)
  },
  dismiss: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
}))
