import { create } from 'zustand'

export interface Toast { id: number; kind: 'success' | 'error' | 'info'; title: string; body?: string }
interface ToastState { toasts: Toast[]; push: (t: Omit<Toast, 'id'>) => void; dismiss: (id: number) => void }

let seq = 1
export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push(t) {
    const id = seq++
    set({ toasts: [...get().toasts.slice(-3), { ...t, id }] })
    setTimeout(() => get().dismiss(id), t.kind === 'error' ? 9000 : 5000)
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}))

export const toast = {
  success: (title: string, body?: string) => useToasts.getState().push({ kind: 'success', title, body }),
  error: (title: string, body?: string) => useToasts.getState().push({ kind: 'error', title, body }),
  info: (title: string, body?: string) => useToasts.getState().push({ kind: 'info', title, body }),
}
