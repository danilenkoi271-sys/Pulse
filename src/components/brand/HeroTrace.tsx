import { useEffect, useMemo, useState } from 'react'
import { fetchCandles } from '@/lib/hl/candles'
import { subs } from '@/lib/hl/clients'
import { num } from '@/lib/format/numbers'

const W = 1200
const H = 280
const MID = H / 2

/**
 * The market's heartbeat: the bar-to-bar return of BTC (5m candles) drawn as an ECG trace.
 * Quiet markets are a flat line; volatility is the spike. Real data, live-updated.
 */
export function HeroTrace() {
  const [closes, setCloses] = useState<number[] | null>(null)

  useEffect(() => {
    let cancelled = false
    let off: (() => Promise<void>) | null = null
    fetchCandles('BTC', '5m', 150).then((cs) => !cancelled && setCloses(cs.map((c) => c.close))).catch(() => undefined)
    subs().candle({ coin: 'BTC', interval: '5m' }, (ev) => {
      if (cancelled) return
      setCloses((prev) => {
        if (!prev) return prev
        const px = num(ev.c)
        const lastT = Math.floor(ev.t / 1000)
        // same candle → replace last close; new candle → append
        const arr = prev.slice()
        const key = `${lastT}`
        if ((arr as unknown as { _t?: string })._t === key) arr[arr.length - 1] = px
        else { (arr as unknown as { _t?: string })._t = key; arr.push(px); if (arr.length > 150) arr.shift() }
        return arr
      })
    }).then((s) => (cancelled ? void s.unsubscribe().catch(() => undefined) : (off = () => s.unsubscribe()))).catch(() => undefined)
    return () => { cancelled = true; void off?.().catch(() => undefined) }
  }, [])

  const { d, last } = useMemo(() => {
    if (!closes || closes.length < 3) return { d: `M0 ${MID}H${W}`, last: { x: W, y: MID } }
    const rets = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i])
    const peak = Math.max(...rets.map(Math.abs), 1e-6)
    const k = (MID - 24) / peak
    const step = W / (rets.length - 1)
    // ECG feel: each bar is a spike up/down from a flat baseline between bars.
    let path = `M0 ${MID}`
    let lx = 0, ly = MID
    rets.forEach((r, i) => {
      const x = i * step
      const y = MID - r * k
      path += ` H${(x - step * 0.34).toFixed(1)} L${x.toFixed(1)} ${y.toFixed(1)} L${(x + step * 0.34).toFixed(1)} ${MID}`
      lx = x; ly = y
    })
    return { d: path + ` H${W}`, last: { x: lx, y: ly } }
  }, [closes])

  return (
    <div className="relative overflow-hidden" aria-hidden="true">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-[180px] w-full sm:h-[240px]" preserveAspectRatio="none" fill="none">
        <g stroke="#2a2721" strokeWidth="1">
          {Array.from({ length: 13 }, (_, i) => <line key={i} x1={(i * W) / 12} y1="0" x2={(i * W) / 12} y2={H} strokeDasharray="2 6" />)}
          <line x1="0" y1={MID} x2={W} y2={MID} />
        </g>
        <path d={d} stroke="#d6ff3d" strokeWidth="1.6" strokeLinejoin="miter" vectorEffect="non-scaling-stroke" pathLength={1} strokeDasharray="1" strokeDashoffset="1" className="animate-draw" />
        <circle cx={last.x} cy={last.y} r="4" fill="#d6ff3d" className="animate-blink" />
      </svg>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1/5 animate-sweep bg-gradient-to-r from-transparent to-base/70" />
    </div>
  )
}
