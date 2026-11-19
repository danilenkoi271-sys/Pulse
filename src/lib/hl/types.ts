export type MarketKind = 'perp' | 'spot' | 'hip3'

export interface Market {
  /** Unique key == the coin string Hyperliquid uses in API calls ("BTC", "xyz:AAPL", "@107", "PURR/USDC"). */
  key: string
  coin: string
  kind: MarketKind
  dex: string
  base: string
  quote: string
  /** Human label: "BTC", "AAPL", "HYPE/USDC". */
  label: string
  assetId: number
  szDecimals: number
  maxLeverage: number
  onlyIsolated: boolean
  /** Index into the ctx array for the market's dex (perp/hip3) or spot universe. */
  ctxIndex: number
  /** Multiplier on base protocol fees (HIP-3 deployer fee scale / growth mode). 1 for core perps & spot. */
  feeMult: number
}

export interface MarketCtx {
  mark: number
  mid: number | null
  prevDay: number
  /** 24h notional volume (USD). */
  volume: number
  /** Hourly funding rate as a fraction (0.0000125 = 0.00125%/h). 0 for spot. */
  funding: number
  openInterest: number
  oracle: number
}

export type Interval = '1m' | '3m' | '5m' | '15m' | '30m' | '1h' | '2h' | '4h' | '8h' | '12h' | '1d' | '3d' | '1w' | '1M'

export interface Candle {
  time: number // seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}
