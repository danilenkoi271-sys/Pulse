import { create } from 'zustand'
import type { InfoClient, SubscriptionClient } from '@nktkas/hyperliquid'
import { info, subs } from '@/lib/hl/clients'
import { HIP3_DEXS } from '@/config/env'
import { num } from '@/lib/format/numbers'
import { DEFAULT_PERP_FEES, type FeeRates } from '@/lib/hl/orders'

type Unsub = { unsubscribe: () => Promise<void> }
export type OpenOrder = Parameters<Parameters<SubscriptionClient['openOrders']>[1]>[0]['orders'][number]
export type Fill = Parameters<Parameters<SubscriptionClient['userFills']>[1]>[0]['fills'][number]
export type HistoricalOrder = Parameters<Parameters<SubscriptionClient['userHistoricalOrders']>[1]>[0]['orderHistory'][number]
export type SpotBalance = Parameters<Parameters<SubscriptionClient['spotState']>[1]>[0]['spotState']['balances'][number]
export type AbstractionMode = Awaited<ReturnType<InfoClient['userAbstraction']>>

export interface Position {
  dex: string
  coin: string
  size: number // signed: >0 long, <0 short
  entryPx: number
  positionValue: number
  unrealizedPnl: number
  roe: number
  liquidationPx: number | null
  marginUsed: number
  leverage: { type: 'cross' | 'isolated'; value: number }
  maxLeverage: number
  fundingSinceOpen: number
}

export interface DexSummary {
  accountValue: number
  withdrawable: number
  marginUsed: number
  notional: number
}

interface AccountState {
  address: `0x${string}` | null
  loaded: boolean
  mode: AbstractionMode | null
  fees: FeeRates
  dexSummary: Record<string, DexSummary>
  positions: Position[]
  openOrders: OpenOrder[]
  fills: Fill[]
  history: HistoricalOrder[]
  spot: SpotBalance[]
  start: (address: `0x${string}`) => void
  stop: () => void
}

const EMPTY = { loaded: false, mode: null, dexSummary: {}, positions: [], openOrders: [], fills: [], history: [], spot: [], fees: DEFAULT_PERP_FEES }

let unsubs: Unsub[] = []
let generation = 0

export const useAccount = create<AccountState>((set, get) => ({
  address: null,
  ...EMPTY,

  start(address) {
    if (get().address === address) return
    get().stop()
    const gen = ++generation
    set({ address, ...EMPTY })
    const alive = () => gen === generation
    const track = (p: Promise<Unsub>) => p.then((s) => (alive() ? unsubs.push(s) : void s.unsubscribe().catch(() => undefined))).catch((e) => console.warn('[pulse] subscription failed', e))

    const dexs = ['', ...HIP3_DEXS]
    const posByDex: Record<string, Position[]> = {}
    const ordersByDex: Record<string, OpenOrder[]> = {}

    const publishPositions = () => set({ positions: Object.values(posByDex).flat(), loaded: true })
    const publishOrders = () => set({ openOrders: Object.values(ordersByDex).flat().sort((a, b) => b.timestamp - a.timestamp) })

    for (const dex of dexs) {
      track(
        subs().clearinghouseState({ user: address, dex }, (ev) => {
          if (!alive()) return
          const st = ev.clearinghouseState
          posByDex[dex] = st.assetPositions.map(({ position: p }) => ({
            dex,
            coin: p.coin,
            size: num(p.szi),
            entryPx: num(p.entryPx),
            positionValue: num(p.positionValue),
            unrealizedPnl: num(p.unrealizedPnl),
            roe: num(p.returnOnEquity),
            liquidationPx: p.liquidationPx ? num(p.liquidationPx) : null,
            marginUsed: num(p.marginUsed),
            leverage: { type: p.leverage.type, value: p.leverage.value },
            maxLeverage: p.maxLeverage,
            fundingSinceOpen: num(p.cumFunding.sinceOpen),
          }))
          set({
            dexSummary: {
              ...get().dexSummary,
              [dex]: {
                accountValue: num(st.marginSummary.accountValue),
                withdrawable: num(st.withdrawable),
                marginUsed: num(st.marginSummary.totalMarginUsed),
                notional: num(st.marginSummary.totalNtlPos),
              },
            },
          })
          publishPositions()
        }),
      )
      track(
        subs().openOrders({ user: address, dex }, (ev) => {
          if (!alive()) return
          ordersByDex[dex] = ev.orders
          publishOrders()
        }),
      )
    }

    track(subs().spotState({ user: address }, (ev) => alive() && set({ spot: ev.spotState.balances })))
    track(
      subs().userFills({ user: address }, (ev) => {
        if (!alive()) return
        const incoming = ev.fills
        const merged = ev.isSnapshot ? incoming : [...incoming, ...get().fills]
        const seen = new Set<string>()
        const dedup = merged.filter((f) => (seen.has(`${f.hash}:${f.tid}`) ? false : (seen.add(`${f.hash}:${f.tid}`), true)))
        set({ fills: dedup.sort((a, b) => b.time - a.time).slice(0, 300) })
      }),
    )
    track(
      subs().userHistoricalOrders({ user: address }, (ev) => {
        if (!alive()) return
        const merged = ev.isSnapshot ? ev.orderHistory : [...ev.orderHistory, ...get().history]
        const seen = new Set<number>()
        const dedup = merged.filter((h) => (seen.has(h.order.oid) ? false : (seen.add(h.order.oid), true)))
        set({ history: dedup.sort((a, b) => b.statusTimestamp - a.statusTimestamp).slice(0, 300) })
      }),
    )

    // One-shot lookups (no subscription exists for these).
    info.userAbstraction({ user: address }).then((mode) => alive() && set({ mode })).catch(() => undefined)
    info
      .userFees({ user: address })
      .then((f) => alive() && set({ fees: { taker: num(f.userCrossRate) || DEFAULT_PERP_FEES.taker, maker: num(f.userAddRate) } }))
      .catch(() => undefined)
  },

  stop() {
    generation++
    const old = unsubs
    unsubs = []
    old.forEach((s) => void s.unsubscribe().catch(() => undefined))
    set({ address: null, ...EMPTY })
  },
}))
