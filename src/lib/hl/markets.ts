import { HIP3_DEXS } from '@/config/env'
import { info } from './clients'
import { num } from '@/lib/format/numbers'
import type { Market, MarketCtx } from './types'

type PerpCtxRaw = {
  prevDayPx: string
  dayNtlVlm: string
  markPx: string
  midPx: string | null
  funding: string
  openInterest: string
  oraclePx: string
}

export const ctxFromPerp = (c: PerpCtxRaw): MarketCtx => ({
  mark: num(c.markPx),
  mid: c.midPx ? num(c.midPx) : null,
  prevDay: num(c.prevDayPx),
  volume: num(c.dayNtlVlm),
  funding: num(c.funding),
  openInterest: num(c.openInterest) * num(c.markPx),
  oracle: num(c.oraclePx),
})

export const ctxFromSpot = (c: { prevDayPx: string; dayNtlVlm: string; markPx: string; midPx: string | null }): MarketCtx => ({
  mark: num(c.markPx),
  mid: c.midPx ? num(c.midPx) : null,
  prevDay: num(c.prevDayPx),
  volume: num(c.dayNtlVlm),
  funding: 0,
  openInterest: 0,
  oracle: num(c.markPx),
})

/**
 * HIP-3 fee multiplier vs. the base protocol fee (per Hyperliquid's fee docs): the deployer's fee share
 * is added on top (scale ≤ 1), or — above 100% — the protocol fee is raised to equal the deployer fee.
 * Growth mode cuts the base protocol fee by 90%.
 */
export function hip3FeeMult(scale: number, growth: boolean): number {
  const s = Number.isFinite(scale) && scale >= 0 ? scale : 1
  const base = growth ? 0.1 : 1
  return s <= 1 ? base * (1 + s) : base * 2 * s
}

export interface LoadedMarkets {
  markets: Market[]
  ctx: Record<string, MarketCtx>
  /** dex name ('' = main) -> markets in ctx-array order, used to map live ctx arrays. */
  byDex: Record<string, Market[]>
  spot: Market[]
}

/** Loads perps (main dex), configured HIP-3 dexs, and spot from the Info API. */
export async function loadMarkets(): Promise<LoadedMarkets> {
  const [[meta, ctxs], dexs, [spotMeta, spotCtxs]] = await Promise.all([
    info.metaAndAssetCtxs(),
    info.perpDexs(),
    info.spotMetaAndAssetCtxs(),
  ])

  const markets: Market[] = []
  const ctx: Record<string, MarketCtx> = {}
  const byDex: Record<string, Market[]> = { '': [] }

  meta.universe.forEach((u, i) => {
    if (u.isDelisted) return
    const m: Market = {
      key: u.name, coin: u.name, kind: 'perp', dex: '', base: u.name, quote: 'USDC', label: u.name,
      assetId: i, szDecimals: u.szDecimals, maxLeverage: u.maxLeverage, onlyIsolated: !!u.onlyIsolated, ctxIndex: i, feeMult: 1,
    }
    markets.push(m)
    byDex[''].push(m)
    if (ctxs[i]) ctx[m.key] = ctxFromPerp(ctxs[i])
  })

  // HIP-3: asset id = 100000 + perpDexIndex * 10000 + indexInMeta (index = position in perpDexs, [0] is null/main)
  await Promise.all(
    HIP3_DEXS.map(async (dex) => {
      const dexIndex = dexs.findIndex((d) => d?.name === dex)
      if (dexIndex < 1) return
      const [dm, dctxs] = await info.metaAndAssetCtxs({ dex })
      byDex[dex] = []
      dm.universe.forEach((u, i) => {
        if (u.isDelisted) return
        const coin = u.name.includes(':') ? u.name : `${dex}:${u.name}`
        const m: Market = {
          key: coin, coin, kind: 'hip3', dex, base: coin.split(':')[1], quote: 'USDC', label: coin.split(':')[1],
          assetId: 100000 + dexIndex * 10000 + i, szDecimals: u.szDecimals, maxLeverage: u.maxLeverage,
          onlyIsolated: !!u.onlyIsolated || u.marginMode === 'strictIsolated' || u.marginMode === 'noCross', ctxIndex: i,
          feeMult: hip3FeeMult(Number((u as { deployerFeeScale?: string }).deployerFeeScale ?? 1), u.growthMode === 'enabled'),
        }
        markets.push(m)
        byDex[dex].push(m)
        if (dctxs[i]) ctx[m.key] = ctxFromPerp(dctxs[i])
      })
    }),
  )

  // Spot: asset id = 10000 + spotIndex. API coin is "@index" except PURR/USDC.
  const spot: Market[] = []
  spotMeta.universe.forEach((u) => {
    const base = spotMeta.tokens[u.tokens[0]]
    const quote = spotMeta.tokens[u.tokens[1]]
    if (!base || !quote) return
    const coin = u.name === 'PURR/USDC' ? 'PURR/USDC' : `@${u.index}`
    const m: Market = {
      key: coin, coin, kind: 'spot', dex: '', base: base.name, quote: quote.name, label: `${base.name}/${quote.name}`,
      assetId: 10000 + u.index, szDecimals: base.szDecimals, maxLeverage: 1, onlyIsolated: false, ctxIndex: u.index, feeMult: 1,
    }
    spot.push(m)
    const c = spotCtxs[u.index]
    if (c) ctx[m.key] = ctxFromSpot(c)
  })
  // Hide dead spot pairs (no volume and no price) to keep the list useful.
  const liveSpot = spot.filter((m) => (ctx[m.key]?.mark ?? 0) > 0)
  markets.push(...liveSpot)

  return { markets, ctx, byDex, spot: liveSpot }
}
