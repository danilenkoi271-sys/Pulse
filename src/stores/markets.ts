import { create } from 'zustand'
import { subs } from '@/lib/hl/clients'
import { ctxFromPerp, ctxFromSpot, loadMarkets, type LoadedMarkets } from '@/lib/hl/markets'
import type { Market, MarketCtx } from '@/lib/hl/types'
import { HIP3_DEXS } from '@/config/env'

interface MarketsState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  error?: string
  markets: Market[]
  byKey: Record<string, Market>
  ctx: Record<string, MarketCtx>
  /** Last-tick direction per market for price flash animations. */
  flash: Record<string, 'up' | 'down'>
  init: () => Promise<void>
}

let started = false

export const useMarkets = create<MarketsState>((set, get) => ({
  status: 'idle',
  markets: [],
  byKey: {},
  ctx: {},
  flash: {},
  async init() {
    if (started) return
    started = true
    set({ status: 'loading' })
    try {
      const data = await loadMarkets()
      set({
        status: 'ready',
        markets: data.markets,
        byKey: Object.fromEntries(data.markets.map((m) => [m.key, m])),
        ctx: data.ctx,
      })
      startLive(data, set, get)
    } catch (e) {
      started = false
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  },
}))

/**
 * Live ctx streams (prices, funding, volume). Updates are coalesced into one store
 * write per animation window so 300+ markets don't cause a render storm.
 */
function startLive(
  data: LoadedMarkets,
  set: (p: Partial<MarketsState>) => void,
  get: () => MarketsState,
) {
  const pending: Record<string, MarketCtx> = {}
  let timer: ReturnType<typeof setTimeout> | null = null

  const flush = () => {
    timer = null
    const prev = get().ctx
    const next = { ...prev }
    const flash: Record<string, 'up' | 'down'> = {}
    for (const [k, c] of Object.entries(pending)) {
      const old = prev[k]
      if (old && c.mark !== old.mark) flash[k] = c.mark > old.mark ? 'up' : 'down'
      next[k] = c
      delete pending[k]
    }
    set({ ctx: next, flash })
  }
  const queue = () => {
    if (!timer) timer = setTimeout(flush, 500)
  }

  for (const dex of ['', ...HIP3_DEXS]) {
    const list = data.byDex[dex]
    if (!list?.length) continue
    subs()
      .assetCtxs({ dex }, (ev) => {
        for (const m of list) {
          const c = ev.ctxs[m.ctxIndex]
          if (c) pending[m.key] = ctxFromPerp(c)
        }
        queue()
      })
      .catch((e) => console.warn('[pulse] assetCtxs failed', dex, e))
  }
  if (data.spot.length) {
    subs()
      .spotAssetCtxs((ev) => {
        for (const m of data.spot) {
          const c = ev[m.ctxIndex]
          if (c) pending[m.key] = ctxFromSpot(c)
        }
        queue()
      })
      .catch((e) => console.warn('[pulse] spotAssetCtxs failed', e))
  }
}
