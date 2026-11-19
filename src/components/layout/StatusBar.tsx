import { memo, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarkets } from '@/stores/markets'
import { useConnection } from '@/hooks/useConnection'
import { PriceCell } from '@/components/market/PriceCell'
import { fmtPct, pctChange } from '@/lib/format/numbers'
import { IS_TESTNET } from '@/config/env'

function Clock() {
  const [t, setT] = useState(() => new Date())
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i) }, [])
  return <span className="num text-mute">{t.toISOString().slice(11, 19)} UTC</span>
}

const Item = memo(function Item({ k }: { k: string }) {
  const label = useMarkets((s) => s.byKey[k]?.label)
  const prev = useMarkets((s) => s.ctx[k]?.prevDay ?? 0)
  const mark = useMarkets((s) => s.ctx[k]?.mark ?? 0)
  const ch = pctChange(mark, prev)
  return (
    <Link to={`/trade/${encodeURIComponent(k)}`} className="flex shrink-0 items-baseline gap-2 px-4 hover:bg-raise">
      <span className="font-mono text-[11px] font-semibold text-bone">{label}</span>
      <PriceCell mkey={k} className="text-[11px] text-mute" />
      <span className={`num text-[10px] ${ch >= 0 ? 'text-up' : 'text-down'}`}>{ch >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(ch), 2, false)}</span>
    </Link>
  )
})

/** Bottom instrument strip: connection state, scrolling tape of the most active markets, clock. */
export function StatusBar() {
  const conn = useConnection()
  const markets = useMarkets((s) => s.markets)
  const status = useMarkets((s) => s.status)
  const ctx = useMarkets((s) => s.ctx)
  // Snapshot of the top markets by volume; refreshed only when the list first loads.
  const top = useMemo(
    () => (status === 'ready' ? markets.filter((m) => m.kind !== 'spot').sort((a, b) => (ctx[b.key]?.volume ?? 0) - (ctx[a.key]?.volume ?? 0)).slice(0, 16).map((m) => m.key) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, markets],
  )
  const dot = conn === 'live' ? 'bg-up animate-blink' : conn === 'connecting' ? 'bg-warn animate-blink' : 'bg-down'
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 hidden h-7 items-center border-t border-line bg-void md:flex">
      <div className="flex h-full shrink-0 items-center gap-2 border-r border-line px-3">
        <span className={`h-1.5 w-1.5 ${dot}`} />
        <span className="k !text-mute">{conn === 'live' ? 'Live' : conn === 'connecting' ? 'Connecting' : 'Offline'}</span>
        <span className="k">· {IS_TESTNET ? 'Testnet' : 'Mainnet'}</span>
      </div>
      <div className="group relative h-full min-w-0 flex-1 overflow-hidden">
        {top.length > 0 && (
          <div className="flex h-full w-max animate-marquee items-center group-hover:[animation-play-state:paused]">
            {[0, 1].map((n) => <div key={n} className="flex h-full items-center divide-x divide-line" aria-hidden={n === 1}>{top.map((k) => <Item key={k} k={k} />)}</div>)}
          </div>
        )}
      </div>
      <div className="flex h-full shrink-0 items-center gap-4 border-l border-line px-3">
        <Link to="/terms" className="k hover:text-bone">Terms</Link>
        <Link to="/risk" className="k hover:text-bone">Risk</Link>
        <Clock />
      </div>
    </div>
  )
}
