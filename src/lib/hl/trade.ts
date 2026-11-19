import type { ExchangeClient } from '@nktkas/hyperliquid'
import type { BuiltOrder } from './orders'

export type OrderResult =
  | { kind: 'resting'; oid: number }
  | { kind: 'filled'; oid: number; avgPx: string; totalSz: string }
  | { kind: 'waiting' }
  | { kind: 'error'; message: string }

export interface Builder { b: `0x${string}`; f: number }

/** Human-readable message from any SDK / network / wallet error. */
export function errMsg(e: unknown): string {
  if (e instanceof Error) {
    const m = e.message || e.name
    if (/user rejected|denied|rejected the request/i.test(m)) return 'Signature rejected in your wallet.'
    return m.length > 240 ? `${m.slice(0, 240)}…` : m
  }
  return String(e)
}

function normalize(statuses: unknown[]): OrderResult[] {
  return statuses.map((s): OrderResult => {
    if (s === 'waitingForFill' || s === 'waitingForTrigger') return { kind: 'waiting' }
    const o = s as Record<string, any>
    if (o?.error) return { kind: 'error', message: String(o.error) }
    if (o?.filled) return { kind: 'filled', oid: o.filled.oid, avgPx: o.filled.avgPx, totalSz: o.filled.totalSz }
    if (o?.resting) return { kind: 'resting', oid: o.resting.oid }
    return { kind: 'waiting' }
  })
}

export async function submitOrder(ex: ExchangeClient, built: BuiltOrder, builder?: Builder): Promise<OrderResult[]> {
  const res = await ex.order({ orders: built.orders, grouping: built.grouping, ...(builder ? { builder } : {}) })
  return normalize(res.response.data.statuses)
}

export async function setLeverage(ex: ExchangeClient, asset: number, isCross: boolean, leverage: number) {
  await ex.updateLeverage({ asset, isCross, leverage })
}

export async function cancelOrder(ex: ExchangeClient, asset: number, oid: number) {
  await ex.cancel({ cancels: [{ a: asset, o: oid }] })
}

export async function cancelMany(ex: ExchangeClient, items: { asset: number; oid: number }[]) {
  if (!items.length) return
  await ex.cancel({ cancels: items.map((i) => ({ a: i.asset, o: i.oid })) })
}
