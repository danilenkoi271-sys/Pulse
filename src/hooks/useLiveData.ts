import { useEffect, useRef, useState } from 'react'
import type { SubscriptionClient } from '@nktkas/hyperliquid'
import { subs } from '@/lib/hl/clients'

export type L2Book = Parameters<Parameters<SubscriptionClient['l2Book']>[1]>[0]
export type TradeTick = Parameters<Parameters<SubscriptionClient['trades']>[1]>[0][number]
export type ActiveAssetData = Parameters<Parameters<SubscriptionClient['activeAssetData']>[1]>[0]

/** Subscribes via the shared socket; always unsubscribes (even if the subscribe call resolves late). */
function useSub<T>(enabled: boolean, deps: unknown[], subscribe: (cb: (d: T) => void) => Promise<{ unsubscribe: () => Promise<void> }>, onData: (d: T) => void) {
  const cb = useRef(onData)
  cb.current = onData
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let unsub: (() => Promise<void>) | null = null
    subscribe((d) => !cancelled && cb.current(d))
      .then((s) => (cancelled ? void s.unsubscribe().catch(() => undefined) : void (unsub = () => s.unsubscribe())))
      .catch(() => undefined)
    return () => {
      cancelled = true
      void unsub?.().catch(() => undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])
}

/**
 * Live L2 book. Incoming messages (can be several per second) are held in a ref and flushed to React
 * state at most every `throttleMs`, so the book never causes render storms.
 */
export function useL2Book(coin: string, nSigFigs: 2 | 3 | 4 | 5 | null, throttleMs = 150): L2Book | null {
  const [book, setBook] = useState<L2Book | null>(null)
  const latest = useRef<L2Book | null>(null)
  const dirty = useRef(false)

  useEffect(() => { setBook(null); latest.current = null; dirty.current = false }, [coin, nSigFigs])
  useEffect(() => {
    const t = setInterval(() => {
      if (dirty.current && latest.current) { dirty.current = false; setBook(latest.current) }
    }, throttleMs)
    return () => clearInterval(t)
  }, [throttleMs])

  useSub<L2Book>(true, [coin, nSigFigs], (cb) => subs().l2Book({ coin, nSigFigs }, cb), (d) => {
    if (d.coin !== coin) return
    latest.current = d
    dirty.current = true
  })
  return book
}

export function useRecentTrades(coin: string, max = 40, throttleMs = 200): TradeTick[] {
  const [trades, setTrades] = useState<TradeTick[]>([])
  const buf = useRef<TradeTick[]>([])
  const dirty = useRef(false)

  useEffect(() => { setTrades([]); buf.current = []; dirty.current = false }, [coin])
  useEffect(() => {
    const t = setInterval(() => {
      if (dirty.current) { dirty.current = false; setTrades(buf.current.slice(0, max)) }
    }, throttleMs)
    return () => clearInterval(t)
  }, [max, throttleMs])

  useSub<TradeTick[]>(true, [coin], (cb) => subs().trades({ coin }, cb), (d) => {
    const mine = d.filter((x) => x.coin === coin)
    if (!mine.length) return
    buf.current = [...mine.sort((a, b) => b.time - a.time), ...buf.current].slice(0, max * 2)
    dirty.current = true
  })
  return trades
}

/** Per-asset account data: leverage setting, max trade size and available balance for `user`. */
export function useActiveAssetData(user: `0x${string}` | null, coin: string): ActiveAssetData | null {
  const [data, setData] = useState<ActiveAssetData | null>(null)
  useEffect(() => setData(null), [user, coin])
  useSub<ActiveAssetData>(!!user, [user, coin], (cb) => subs().activeAssetData({ user: user!, coin }, cb), (d) => {
    if (d.coin === coin) setData(d)
  })
  return data
}
