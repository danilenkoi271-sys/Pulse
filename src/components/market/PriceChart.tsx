import { memo, useEffect, useRef, useState } from 'react'
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts'
import { subs } from '@/lib/hl/clients'
import { fetchCandles, INTERVALS, toCandle } from '@/lib/hl/candles'
import type { Interval } from '@/lib/hl/types'
import { Spinner } from '@/components/ui/Spinner'

const UP = '#1fd8a0'
const DOWN = '#ff5470'

function PriceChartBase({ coin }: { coin: string }) {
  const host = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const volRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const [interval, setIntervalState] = useState<Interval>('15m')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Create the chart once.
  useEffect(() => {
    if (!host.current) return
    const chart = createChart(host.current, {
      autoSize: true,
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#8591ab', fontFamily: 'ui-sans-serif, system-ui', attributionLogo: false },
      grid: { vertLines: { color: 'rgba(38,46,65,.45)' }, horzLines: { color: 'rgba(38,46,65,.45)' } },
      crosshair: { mode: CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#1b2130' },
      timeScale: { borderColor: '#1b2130', timeVisible: true, secondsVisible: false },
    })
    const candles = chart.addSeries(CandlestickSeries, {
      upColor: UP, downColor: DOWN, borderUpColor: UP, borderDownColor: DOWN, wickUpColor: UP, wickDownColor: DOWN,
      priceFormat: { type: 'price', precision: 2, minMove: 0.0000001 },
    })
    const vol = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: '' })
    vol.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
    chartRef.current = chart
    candleRef.current = candles
    volRef.current = vol
    return () => {
      chart.remove()
      chartRef.current = candleRef.current = volRef.current = null
    }
  }, [])

  // (Re)load history + live stream when market or interval changes.
  useEffect(() => {
    let cancelled = false
    let unsub: (() => Promise<void>) | null = null
    setLoading(true)
    setError(null)

    fetchCandles(coin, interval)
      .then((cs) => {
        if (cancelled || !candleRef.current || !volRef.current) return
        // Adapt price precision to the instrument so sub-cent assets render properly.
        const last = cs[cs.length - 1]?.close ?? 1
        const precision = last >= 1000 ? 1 : last >= 10 ? 2 : last >= 1 ? 4 : last >= 0.01 ? 5 : 7
        candleRef.current.applyOptions({ priceFormat: { type: 'price', precision, minMove: 10 ** -precision } })
        candleRef.current.setData(cs.map((c) => ({ ...c, time: c.time as UTCTimestamp })))
        volRef.current.setData(cs.map((c) => ({ time: c.time as UTCTimestamp, value: c.volume, color: c.close >= c.open ? 'rgba(31,216,160,.35)' : 'rgba(255,84,112,.35)' })))
        chartRef.current?.timeScale().fitContent()
        setLoading(false)
      })
      .catch((e) => !cancelled && (setError(e instanceof Error ? e.message : 'Failed to load candles'), setLoading(false)))

    subs()
      .candle({ coin, interval }, (ev) => {
        if (cancelled || ev.s !== coin || ev.i !== interval) return
        const c = toCandle(ev)
        candleRef.current?.update({ ...c, time: c.time as UTCTimestamp })
        volRef.current?.update({ time: c.time as UTCTimestamp, value: c.volume, color: c.close >= c.open ? 'rgba(31,216,160,.35)' : 'rgba(255,84,112,.35)' })
      })
      .then((s) => {
        if (cancelled) void s.unsubscribe().catch(() => undefined)
        else unsub = () => s.unsubscribe()
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      void unsub?.().catch(() => undefined)
    }
  }, [coin, interval])

  return (
    <div className="flex h-full min-h-[320px] flex-col">
      <div className="flex items-center gap-1 border-b border-ink-700/70 px-3 py-2">
        {INTERVALS.map((i) => (
          <button key={i} className={`chip ${i === interval ? 'chip-active' : ''}`} onClick={() => setIntervalState(i)}>
            {i}
          </button>
        ))}
        {loading && <Spinner className="ml-2" />}
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={host} className="absolute inset-0" />
        {error && <div className="absolute inset-0 grid place-items-center text-sm text-down">{error}</div>}
      </div>
    </div>
  )
}

export const PriceChart = memo(PriceChartBase)
