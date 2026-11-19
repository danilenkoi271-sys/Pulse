import { memo, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarkets } from '@/stores/markets'
import { useFavorites } from '@/stores/favorites'
import { PriceCell } from '@/components/market/PriceCell'
import { Help, HELP } from '@/components/ui/Tooltip'
import { Spinner } from '@/components/ui/Spinner'
import type { Market } from '@/lib/hl/types'
import { fmtPct, fmtUsd, fundingHourlyPct, pctChange } from '@/lib/format/numbers'
import { HIP3_DEXS } from '@/config/env'

type Tab = 'fav' | 'perp' | 'hip3' | 'spot'
type SortKey = 'volume' | 'change' | 'funding' | 'name' | 'oi'

/** Horizontal bar whose length is |24h change| (capped at 20%), growing from a centre line. */
function ChangeBar({ pct }: { pct: number }) {
  const w = Math.min(50, (Math.abs(pct) / 20) * 50)
  return (
    <span aria-hidden className="relative block h-[3px] w-16 bg-line">
      <span className="absolute inset-y-0 left-1/2 w-px bg-line2" />
      <span className={`absolute inset-y-0 ${pct >= 0 ? 'left-1/2 bg-up' : 'right-1/2 bg-down'}`} style={{ width: `${w}%` }} />
    </span>
  )
}

const Row = memo(function Row({ m, fav, onFav }: { m: Market; fav: boolean; onFav: (k: string) => void }) {
  const c = useMarkets((s) => s.ctx[m.key])
  const ch = c ? pctChange(c.mark, c.prevDay) : 0
  return (
    <tr className="group rowline hover:bg-raise">
      <td className="w-9 border-l-2 border-transparent pl-2 group-hover:border-lime">
        <button aria-label={fav ? 'Remove favourite' : 'Add favourite'} aria-pressed={fav} onClick={() => onFav(m.key)} className={fav ? 'text-lime' : 'text-line2 hover:text-mute'}>★</button>
      </td>
      <td className="px-3 py-3">
        <Link to={`/trade/${encodeURIComponent(m.key)}`} className="flex items-baseline gap-2">
          <span className="font-mono text-[14px] font-semibold text-bone group-hover:text-lime">{m.label}</span>
          <span className="k">{m.kind === 'spot' ? 'spot' : m.kind === 'hip3' ? m.dex : `${m.maxLeverage}x`}</span>
        </Link>
      </td>
      <td className="px-3 py-3 text-right text-[13px] text-bone"><PriceCell mkey={m.key} /></td>
      <td className="px-3 py-3">
        <div className="flex items-center justify-end gap-3">
          <ChangeBar pct={ch} />
          <span className={`num w-16 text-right text-[12px] ${ch >= 0 ? 'text-up' : 'text-down'}`}>{fmtPct(ch)}</span>
        </div>
      </td>
      <td className="num hidden px-3 py-3 text-right text-[12px] text-text sm:table-cell">{fmtUsd(c?.volume, { compact: true })}</td>
      <td className={`num hidden px-3 py-3 text-right text-[12px] md:table-cell ${m.kind === 'spot' || !c ? 'text-dim' : c.funding >= 0 ? 'text-up' : 'text-down'}`}>{m.kind === 'spot' ? '—' : fmtPct(fundingHourlyPct(c?.funding ?? 0), 4)}</td>
      <td className="num hidden px-3 py-3 text-right text-[12px] text-text lg:table-cell">{m.kind === 'spot' ? '—' : fmtUsd(c?.openInterest, { compact: true })}</td>
    </tr>
  )
})

export default function Markets() {
  const { status, error, markets, init, ctx } = useMarkets()
  const { favs, toggle } = useFavorites()
  const [tab, setTab] = useState<Tab>('perp')
  const [q, setQ] = useState('')
  const dq = useDeferredValue(q)
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'volume', dir: -1 })
  useEffect(() => { void init() }, [init])

  const counts = useMemo(() => ({
    perp: markets.filter((m) => m.kind === 'perp').length,
    hip3: markets.filter((m) => m.kind === 'hip3').length,
    spot: markets.filter((m) => m.kind === 'spot').length,
  }), [markets])

  const list = useMemo(() => {
    const term = dq.trim().toLowerCase()
    const val = (m: Market): number | string => {
      const c = ctx[m.key]
      if (sort.key === 'name') return m.label
      if (!c) return 0
      return sort.key === 'volume' ? c.volume : sort.key === 'oi' ? c.openInterest : sort.key === 'funding' ? c.funding : pctChange(c.mark, c.prevDay)
    }
    // Sorted on sort/tab/search changes — not on every price tick — so rows don't jump under the cursor.
    return markets
      .filter((m) => (tab === 'fav' ? favs.includes(m.key) : m.kind === tab) && (!term || m.label.toLowerCase().includes(term) || m.key.toLowerCase().includes(term)))
      .sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)) * sort.dir })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markets, tab, dq, sort, favs, status])

  const th = (key: SortKey, label: string, cls = '', help?: string) => (
    <th className={`th ${cls}`}>
      <span className="inline-flex items-center gap-1.5">
        <button onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))} className={sort.key === key ? 'text-lime' : 'hover:text-bone'}>
          {label}{sort.key === key ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
        </button>
        {help && <Help text={help} />}
      </span>
    </th>
  )

  const tabs: [Tab, string, number | null][] = [['perp', 'Perps', counts.perp], ...(HIP3_DEXS.length ? [['hip3', 'Stocks & commodities', counts.hip3] as [Tab, string, number]] : []), ['spot', 'Spot', counts.spot], ['fav', '★ Watchlist', favs.length]]

  return (
    <div className="mx-auto max-w-[1500px] px-3 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="k">Hyperliquid · live</p>
          <h1 className="display mt-1 text-[clamp(38px,6vw,64px)] text-bone">The board</h1>
        </div>
        <div className="relative w-full sm:w-72">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-lime">/</span>
          <input className="field pl-7" placeholder="Filter this list" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter markets" />
        </div>
      </div>

      <div className="plate">
        <div className="flex overflow-x-auto border-b border-line" role="tablist">
          {tabs.map(([k, l, n]) => (
            <button key={k} role="tab" aria-selected={tab === k} className="tab" onClick={() => setTab(k)}>{l}{n !== null && <span className="ml-1.5 text-lime">{n}</span>}</button>
          ))}
        </div>
        {status === 'loading' || status === 'idle' ? (
          <div className="flex items-center gap-3 p-10"><Spinner /><span className="k">Loading the board…</span></div>
        ) : status === 'error' ? (
          <div className="p-10 font-mono text-[12px] text-down">Couldn’t load markets: {error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[460px]">
              <thead>
                <tr>
                  <th className="th w-9" />
                  {th('name', 'Market')}
                  <th className="th text-right">Price</th>
                  {th('change', '24h', 'text-right')}
                  {th('volume', 'Volume', 'hidden text-right sm:table-cell')}
                  {th('funding', 'Funding/h', 'hidden text-right md:table-cell', HELP.funding)}
                  {th('oi', 'Open interest', 'hidden text-right lg:table-cell', HELP.oi)}
                </tr>
              </thead>
              <tbody>
                {list.map((m) => <Row key={m.key} m={m} fav={favs.includes(m.key)} onFav={toggle} />)}
                {list.length === 0 && <tr><td colSpan={7} className="p-10 text-center font-mono text-[12px] text-dim">{tab === 'fav' ? 'Star a market and it lands here.' : 'No match.'}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
