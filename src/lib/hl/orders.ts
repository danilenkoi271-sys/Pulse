import { formatPrice, formatSize } from '@nktkas/hyperliquid/utils'
import type { Market } from './types'

export type Side = 'buy' | 'sell'
export type OrderKind = 'market' | 'limit'
export type Tif = 'Gtc' | 'Alo' | 'Ioc'

export interface OrderInput {
  market: Market
  side: Side
  kind: OrderKind
  /** Size in base units, as typed by the user. */
  size: string
  /** Limit price (limit orders). */
  price: string
  tif: Tif
  reduceOnly: boolean
  leverage: number
  isCross: boolean
  /** Attached take-profit / stop-loss trigger prices (empty string = none). */
  tp: string
  sl: string
  /** Max slippage for market orders, in percent (e.g. 1 = 1%). */
  slippagePct: number
}

export const MIN_ORDER_USD = 10
const DEC_RE = /^(\d+\.?\d*|\.\d+)$/

/** True for a plain positive decimal string ("12", "0.5", "3."). Rejects exponents, signs, spaces. */
export const isDecimal = (s: string) => DEC_RE.test(s) && Number(s) > 0

/** Count decimal places of a numeric string. */
const decimalsOf = (s: string) => (s.includes('.') ? s.split('.')[1].replace(/0+$/, '').length : 0)

export interface Validation {
  ok: boolean
  errors: string[]
}

/**
 * Strict client-side validation. Hyperliquid validates again server-side; this exists to give
 * clear messages before a signature is requested and to guarantee nothing malformed is ever signed.
 */
export function validateOrder(i: OrderInput, refPrice: number): Validation {
  const errors: string[] = []
  const m = i.market

  if (!isDecimal(i.size)) errors.push('Enter a size greater than 0.')
  else if (decimalsOf(i.size) > m.szDecimals) errors.push(`Size supports at most ${m.szDecimals} decimals.`)

  if (i.kind === 'limit' && !isDecimal(i.price)) errors.push('Enter a valid limit price.')
  if (!(refPrice > 0)) errors.push('No market price available yet.')

  const px = i.kind === 'limit' && isDecimal(i.price) ? Number(i.price) : refPrice
  if (isDecimal(i.size) && px > 0 && Number(i.size) * px < MIN_ORDER_USD && !i.reduceOnly) {
    errors.push(`Minimum order value is $${MIN_ORDER_USD}.`)
  }

  if (m.kind !== 'spot') {
    if (!Number.isInteger(i.leverage) || i.leverage < 1 || i.leverage > m.maxLeverage) {
      errors.push(`Leverage must be a whole number between 1 and ${m.maxLeverage}.`)
    }
    if (m.onlyIsolated && i.isCross) errors.push('This market only supports isolated margin.')

    const isBuy = i.side === 'buy'
    if (i.tp) {
      if (!isDecimal(i.tp)) errors.push('Take-profit price is invalid.')
      else if (px > 0 && (isBuy ? Number(i.tp) <= px : Number(i.tp) >= px)) errors.push(`Take-profit must be ${isBuy ? 'above' : 'below'} your entry price.`)
    }
    if (i.sl) {
      if (!isDecimal(i.sl)) errors.push('Stop-loss price is invalid.')
      else if (px > 0 && (isBuy ? Number(i.sl) >= px : Number(i.sl) <= px)) errors.push(`Stop-loss must be ${isBuy ? 'below' : 'above'} your entry price.`)
    }
  } else if (i.tp || i.sl || i.reduceOnly) {
    errors.push('Take-profit, stop-loss and reduce-only are not available on spot.')
  }

  if (i.kind === 'market' && !(i.slippagePct >= 0.05 && i.slippagePct <= 10)) errors.push('Slippage must be between 0.05% and 10%.')
  return { ok: errors.length === 0, errors }
}

/** Hyperliquid-valid price string (≤5 significant figures, ≤ 6 − szDecimals decimals for perps). */
export const fmtOrderPrice = (price: number, m: Market) => formatPrice(price, m.szDecimals, m.kind === 'spot' ? 'spot' : 'perp')
export const fmtOrderSize = (size: number | string, m: Market) => formatSize(size, m.szDecimals)

/** Non-throwing size formatter for display (floors to the market's size decimals). */
export function displaySize(size: number, m: Market): string {
  if (!Number.isFinite(size) || size <= 0) return '0'
  const f = 10 ** m.szDecimals
  return String(Math.floor(size * f) / f)
}

/** Market orders are aggressive IOC limits priced `slippagePct` through the reference price. */
export function marketLimitPrice(ref: number, side: Side, slippagePct: number, m: Market): string {
  const f = 1 + (side === 'buy' ? 1 : -1) * (slippagePct / 100)
  return fmtOrderPrice(ref * f, m)
}

export interface WireOrder {
  a: number
  b: boolean
  p: string
  s: string
  r: boolean
  t: { limit: { tif: 'Gtc' | 'Ioc' | 'Alo' } } | { trigger: { isMarket: boolean; triggerPx: string; tpsl: 'tp' | 'sl' } }
  c?: `0x${string}`
}

export interface BuiltOrder {
  orders: WireOrder[]
  grouping: 'na' | 'normalTpsl'
}

export function newCloid(): `0x${string}` {
  const b = new Uint8Array(16)
  crypto.getRandomValues(b)
  return `0x${Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')}`
}

/** Builds the wire orders (entry + optional TP/SL children). Throws on invalid input. */
export function buildOrders(i: OrderInput, refPrice: number, cloid: `0x${string}`): BuiltOrder {
  const v = validateOrder(i, refPrice)
  if (!v.ok) throw new Error(v.errors[0])
  const m = i.market
  const isBuy = i.side === 'buy'
  const size = fmtOrderSize(i.size, m)

  const entry: WireOrder = {
    a: m.assetId,
    b: isBuy,
    p: i.kind === 'limit' ? fmtOrderPrice(Number(i.price), m) : marketLimitPrice(refPrice, i.side, i.slippagePct, m),
    s: size,
    r: i.reduceOnly,
    t: { limit: { tif: i.kind === 'market' ? 'Ioc' : i.tif } },
    c: cloid,
  }
  const orders: WireOrder[] = [entry]

  const trigger = (px: string, kind: 'tp' | 'sl'): WireOrder => {
    const trig = Number(px)
    // Child closes the position: opposite side, reduce-only, market-on-trigger with a 10% worst-price bound.
    const worst = fmtOrderPrice(trig * (isBuy ? 0.9 : 1.1), m)
    return { a: m.assetId, b: !isBuy, p: worst, s: size, r: true, t: { trigger: { isMarket: true, triggerPx: fmtOrderPrice(trig, m), tpsl: kind } } }
  }
  if (i.tp) orders.push(trigger(i.tp, 'tp'))
  if (i.sl) orders.push(trigger(i.sl, 'sl'))
  return { orders, grouping: orders.length > 1 ? 'normalTpsl' : 'na' }
}

// ---------------------------------------------------------------------------------------------
// Pre-trade estimates
// ---------------------------------------------------------------------------------------------

/**
 * Estimated liquidation price for a NEW position (Hyperliquid's published formula):
 *   liq = entry − side · margin_available / size / (1 − l·side),  l = 1 / (2 · maxLeverage)
 * For isolated margin, margin_available is the position's margin; for cross it also includes free
 * collateral (`freeCollateral`). Ignores other open positions — shown as an estimate only.
 */
export function estimateLiqPrice(opts: {
  side: Side; entry: number; size: number; leverage: number; maxLeverage: number; isCross: boolean; freeCollateral?: number
}): number | null {
  const { entry, size, leverage, maxLeverage, isCross } = opts
  if (!(entry > 0 && size > 0 && leverage >= 1)) return null
  const s = opts.side === 'buy' ? 1 : -1
  const l = 1 / (2 * maxLeverage)
  const margin = (size * entry) / leverage + (isCross ? Math.max(0, opts.freeCollateral ?? 0) : 0)
  const liq = entry - (s * margin) / size / (1 - l * s)
  if (!Number.isFinite(liq)) return null
  return liq <= 0 ? null : liq // below zero → effectively no liquidation
}

export interface FeeRates { taker: number; maker: number }
/** Public base tier; used until the user's own rates (info.userFees) have loaded. */
export const DEFAULT_PERP_FEES: FeeRates = { taker: 0.00045, maker: 0.00015 }

/** `builderFee` is in tenths of a basis point: 1 → 0.1bp = 1e-5 of notional, 100 → 0.1%. */
export function estimateFee(notional: number, rates: FeeRates, feeMult: number, isMaker: boolean, builderFee = 0) {
  const protocol = notional * (isMaker ? rates.maker : rates.taker) * feeMult
  const builder = (notional * builderFee) / 100_000
  return { protocol, builder, total: protocol + builder }
}
