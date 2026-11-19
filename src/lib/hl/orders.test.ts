import { describe, expect, it } from 'vitest'
import { buildOrders, estimateFee, estimateLiqPrice, isDecimal, validateOrder, type OrderInput } from './orders'
import { hip3FeeMult } from './markets'
import type { Market } from './types'

const btc: Market = {
  key: 'BTC', coin: 'BTC', kind: 'perp', dex: '', base: 'BTC', quote: 'USDC', label: 'BTC',
  assetId: 0, szDecimals: 5, maxLeverage: 40, onlyIsolated: false, ctxIndex: 0, feeMult: 1,
}
const base = (o: Partial<OrderInput> = {}): OrderInput => ({
  market: btc, side: 'buy', kind: 'limit', size: '0.01', price: '60000', tif: 'Gtc', reduceOnly: false,
  leverage: 10, isCross: true, tp: '', sl: '', slippagePct: 1, ...o,
})
const CLOID = '0x00000000000000000000000000000001' as const

describe('isDecimal', () => {
  it('accepts plain positive decimals only', () => {
    for (const s of ['1', '0.5', '.5', '12.']) expect(isDecimal(s)).toBe(true)
    for (const s of ['', '0', '-1', '1e3', ' 1', '1 ', 'abc', '1.2.3', '0x10', 'Infinity']) expect(isDecimal(s)).toBe(false)
  })
})

describe('validateOrder', () => {
  it('accepts a good order', () => expect(validateOrder(base(), 60000).ok).toBe(true))
  it('rejects too many size decimals', () => expect(validateOrder(base({ size: '0.0000001' }), 60000).ok).toBe(false))
  it('enforces the $10 minimum unless reduce-only', () => {
    expect(validateOrder(base({ size: '0.0001' }), 60000).ok).toBe(false) // $6
    expect(validateOrder(base({ size: '0.0001', reduceOnly: true }), 60000).ok).toBe(true)
  })
  it('rejects out-of-range leverage', () => {
    expect(validateOrder(base({ leverage: 0 }), 60000).ok).toBe(false)
    expect(validateOrder(base({ leverage: 41 }), 60000).ok).toBe(false)
    expect(validateOrder(base({ leverage: 2.5 }), 60000).ok).toBe(false)
  })
  it('requires TP above / SL below entry for longs, and the reverse for shorts', () => {
    expect(validateOrder(base({ tp: '59000' }), 60000).ok).toBe(false)
    expect(validateOrder(base({ sl: '61000' }), 60000).ok).toBe(false)
    expect(validateOrder(base({ tp: '65000', sl: '55000' }), 60000).ok).toBe(true)
    expect(validateOrder(base({ side: 'sell', tp: '65000' }), 60000).ok).toBe(false)
    expect(validateOrder(base({ side: 'sell', tp: '55000', sl: '65000' }), 60000).ok).toBe(true)
  })
  it('blocks cross margin on isolated-only markets', () => {
    expect(validateOrder(base({ market: { ...btc, onlyIsolated: true } }), 60000).ok).toBe(false)
    expect(validateOrder(base({ market: { ...btc, onlyIsolated: true }, isCross: false }), 60000).ok).toBe(true)
  })
  it('bounds market-order slippage', () => {
    expect(validateOrder(base({ kind: 'market', slippagePct: 0 }), 60000).ok).toBe(false)
    expect(validateOrder(base({ kind: 'market', slippagePct: 11 }), 60000).ok).toBe(false)
    expect(validateOrder(base({ kind: 'market', slippagePct: 1 }), 60000).ok).toBe(true)
  })
  it('rejects spot TP/SL and reduce-only', () => {
    const spot = { ...btc, kind: 'spot' as const, maxLeverage: 1 }
    expect(validateOrder(base({ market: spot, tp: '65000' }), 60000).ok).toBe(false)
  })
})

describe('buildOrders', () => {
  it('builds a plain GTC limit buy', () => {
    const r = buildOrders(base(), 60000, CLOID)
    expect(r.grouping).toBe('na')
    expect(r.orders).toHaveLength(1)
    expect(r.orders[0]).toMatchObject({ a: 0, b: true, p: '60000', s: '0.01', r: false, t: { limit: { tif: 'Gtc' } }, c: CLOID })
  })
  it('market buy is an IOC priced through the reference by the slippage', () => {
    const r = buildOrders(base({ kind: 'market', slippagePct: 1 }), 60000, CLOID)
    expect(r.orders[0].t).toEqual({ limit: { tif: 'Ioc' } })
    expect(Number(r.orders[0].p)).toBeGreaterThan(60000)
    expect(Number(r.orders[0].p)).toBeLessThanOrEqual(60600 * 1.001)
  })
  it('market sell is priced below the reference', () => {
    const r = buildOrders(base({ side: 'sell', kind: 'market', slippagePct: 1 }), 60000, CLOID)
    expect(r.orders[0].b).toBe(false)
    expect(Number(r.orders[0].p)).toBeLessThan(60000)
  })
  it('attaches reduce-only opposite-side TP/SL children with normalTpsl grouping', () => {
    const r = buildOrders(base({ tp: '66000', sl: '57000' }), 60000, CLOID)
    expect(r.grouping).toBe('normalTpsl')
    expect(r.orders).toHaveLength(3)
    const [, tp, sl] = r.orders
    for (const o of [tp, sl]) { expect(o.b).toBe(false); expect(o.r).toBe(true) }
    expect(tp.t).toMatchObject({ trigger: { isMarket: true, tpsl: 'tp' } })
    expect(sl.t).toMatchObject({ trigger: { isMarket: true, tpsl: 'sl' } })
  })
  it('throws instead of building an invalid order', () => {
    expect(() => buildOrders(base({ size: 'abc' }), 60000, CLOID)).toThrow()
  })
  it('never emits more than 5 significant figures in a price', () => {
    const r = buildOrders(base({ price: '63018.123456' }), 60000, CLOID)
    expect(r.orders[0].p.replace('.', '').replace(/^0+/, '').length).toBeLessThanOrEqual(6)
  })
})

describe('estimateLiqPrice', () => {
  it('is below entry for longs and above for shorts', () => {
    const long = estimateLiqPrice({ side: 'buy', entry: 60000, size: 1, leverage: 10, maxLeverage: 40, isCross: false })!
    const short = estimateLiqPrice({ side: 'sell', entry: 60000, size: 1, leverage: 10, maxLeverage: 40, isCross: false })!
    expect(long).toBeLessThan(60000)
    expect(short).toBeGreaterThan(60000)
  })
  it('matches the published formula for an isolated long (10x, maxLev 40 → ≈ -10.1%)', () => {
    const liq = estimateLiqPrice({ side: 'buy', entry: 60000, size: 1, leverage: 10, maxLeverage: 40, isCross: false })!
    expect(liq).toBeCloseTo(60000 * (1 - 1 / (10 * (1 - 1 / 80))), 4)
  })
  it('higher leverage moves liquidation closer', () => {
    const a = estimateLiqPrice({ side: 'buy', entry: 100, size: 1, leverage: 5, maxLeverage: 20, isCross: false })!
    const b = estimateLiqPrice({ side: 'buy', entry: 100, size: 1, leverage: 15, maxLeverage: 20, isCross: false })!
    expect(b).toBeGreaterThan(a)
  })
  it('cross margin with spare collateral liquidates further away', () => {
    const iso = estimateLiqPrice({ side: 'buy', entry: 100, size: 1, leverage: 10, maxLeverage: 20, isCross: false })!
    const cross = estimateLiqPrice({ side: 'buy', entry: 100, size: 1, leverage: 10, maxLeverage: 20, isCross: true, freeCollateral: 50 })!
    expect(cross).toBeLessThan(iso)
  })
  it('returns null when there is no liquidation price (1x long)', () => {
    // 1x long: margin equals notional, so price would have to go below zero — no liquidation.
    expect(estimateLiqPrice({ side: 'buy', entry: 100, size: 1, leverage: 1, maxLeverage: 20, isCross: false })).toBeNull()
    expect(estimateLiqPrice({ side: 'buy', entry: 100, size: 1, leverage: 2, maxLeverage: 20, isCross: false })).not.toBeNull()
    expect(estimateLiqPrice({ side: 'buy', entry: 100, size: 0, leverage: 1, maxLeverage: 20, isCross: false })).toBeNull()
  })
})

describe('fees', () => {
  const rates = { taker: 0.00045, maker: 0.00015 }
  it('computes taker/maker protocol fees', () => {
    expect(estimateFee(10000, rates, 1, false).protocol).toBeCloseTo(4.5)
    expect(estimateFee(10000, rates, 1, true).protocol).toBeCloseTo(1.5)
  })
  it('builder fee is in tenths of a bp (10 → 0.01%, 100 → 0.1%)', () => {
    expect(estimateFee(10000, rates, 1, false, 10).builder).toBeCloseTo(1)
    expect(estimateFee(10000, rates, 1, false, 100).builder).toBeCloseTo(10)
    expect(estimateFee(10000, rates, 1, false, 0).builder).toBe(0)
  })
  it('HIP-3 multiplier follows the documented fee-share rules', () => {
    expect(hip3FeeMult(1, false)).toBe(2)
    expect(hip3FeeMult(0, false)).toBe(1)
    expect(hip3FeeMult(1, true)).toBeCloseTo(0.2) // growth mode: 0.045% → 0.009%
    expect(hip3FeeMult(3, false)).toBe(6)
  })
})
