import { info } from './clients'
import { num } from '@/lib/format/numbers'
import type { Candle, Interval } from './types'

export const INTERVALS: Interval[] = ['1m', '5m', '15m', '1h', '4h', '1d']

const MS: Record<Interval, number> = {
  '1m': 60e3, '3m': 180e3, '5m': 300e3, '15m': 900e3, '30m': 1800e3, '1h': 3600e3, '2h': 7200e3,
  '4h': 14400e3, '8h': 28800e3, '12h': 43200e3, '1d': 86400e3, '3d': 259200e3, '1w': 604800e3, '1M': 2592000e3,
}

export const toCandle = (c: { t: number; o: string; h: string; l: string; c: string; v: string }): Candle => ({
  time: Math.floor(c.t / 1000),
  open: num(c.o), high: num(c.h), low: num(c.l), close: num(c.c), volume: num(c.v),
})

/** Candle history from the Info API (max ~5000 per request). */
export async function fetchCandles(coin: string, interval: Interval, bars = 800, endTime = Date.now()): Promise<Candle[]> {
  const res = await info.candleSnapshot({ coin, interval, startTime: endTime - MS[interval] * bars, endTime })
  return res.map(toCandle)
}
