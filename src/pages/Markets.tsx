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

const tradePath = (m: Market) => `/trade/${encodeURIComponent(m.key)}`

const Row = memo(function Row({ m, fav, onFav }: { m: Market; fav: boolean; onFav: (k: string) => void }) {
  const c = useMarkets((s) => s.ctx[m.key])
  const ch = c ? pctChange(c.mark, c.prevDay) : 0
  return (
    <tr className="border-t border-ink-800 hover:bg-ink-850">
      <td className="w-8 px-3 py-2.5">
        <button aria-label={fav ? 'Remove favourite' : 'Add favourite'} aria-pressed={fav} onClick={() => onFav(m.key)} className={fav ? 'text-warn' : 'text-ink-500 hover:text-ink-200'}>★</button>
      </td>
      <td className="px-3 py-2.5">
        <Link to={tradePath(m)} className="flex items-center gap-2 font-semibold hover:text-pulse-300">
          {m.label}
          {m.kind !== 'spot' && <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] font-medium text-ink-200">{m.maxLeverage}x</span>}
          {m.kind === 'hip3' && <span className="rounded bg-pulse-600/25 px-1.5 py-0.5 text-[10px] font-medium text-pulse-300">{m.dex}</span>}
        </Link>
      </td>
      <td className="px-3 py-2.5 text-right"><PriceCell mkey={m.key} /></td>
      <td className={`tabular px-3 py-2.5 text-right font-mono ${ch >= 0 ? 'text-up' : 'text-down'}`}>{fmtPct(ch)}</td>
      <td className="tabular hidden px-3 py-2.5 text-right font-mono text-ink-200 sm:table-cell">{fmtUsd(c?.volume, { compact: true })}</td>
      <td className={`tabular hidden px-3 py-2.5 text-right font-mono md:table-cell ${!c || m.kind === 'spot' ? 'text-ink-400' : c.funding >= 0 ? 'text-up' : 'text-down'}`}>
        {m.kind === 'spot' ? '—' : fmtPct(fundingHourlyPct(c?.funding ?? 0), 4)}
      </td>
      <td className="tabular hidden px-3 py-2.5 text-right font-mono text-ink-200 lg:table-cell">{m.kind === 'spot' ? '—' : fmtUsd(c?.openInterest, { compact: true })}</td>
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

  const list = useMemo(() => {
    const term = dq.trim().toLowerCase()
    let l = markets.filter((m) => {
      if (tab === 'fav' && !favs.includes(m.key)) return false
      if (tab === 'perp' && m.kind !== 'perp') return false
      if (tab === 'hip3' && m.kind !== 'hip3') return false
      if (tab === 'spot' && m.kind !== 'spot') return false
      return !term || m.label.toLowerCase().includes(term) || m.key.toLowerCase().includes(term)
    })
    const val = (m: Market): number | string => {
      const c = ctx[m.key]
      if (sort.key === 'name') return m.label
      if (!c) return 0
      if (sort.key === 'volume') return c.volume
      if (sort.key === 'oi') return c.openInterest
      if (sort.key === 'funding') return c.funding
      return pctChange(c.mark, c.prevDay)
    }
    // Sort snapshot only on sort/tab/search change — not on every price tick — to keep rows stable.
    l = [...l].sort((a, b) => {
      const x = val(a), y = val(b)
      return (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)) * sort.dir
    })
    return l
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markets, tab, dq, sort, favs, status])

  const th = (key: SortKey, label: string, cls = '', help?: string) => (
    <th className={`th ${cls}`}>
      <span className="inline-flex items-center gap-1">
        <button onClick={() => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : -1 }))} className="hover:text-ink-100">
          {label}{sort.key === key ? (sort.dir === -1 ? ' ↓' : ' ↑') : ''}
        </button>
        {help && <Help text={help} />}
      </span>
    </th>
  )

  const tabs: [Tab, string][] = [['fav', '★ Favourites'], ['perp', 'Perps'], ...(HIP3_DEXS.length ? [['hip3', 'Stocks & commodities (HIP-3)'] as [Tab, string]] : []), ['spot', 'Spot']]

  return (
    <div className="mx-auto max-w-[1400px] px-3 py-5 sm:px-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Markets</h1>
        <input className="input ml-auto max-w-xs" placeholder="Search BTC, AAPL, HYPE…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search markets" />
      </div>
      <div className="mb-3 flex gap-1 overflow-x-auto">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`chip whitespace-nowrap ${tab === k ? 'chip-active' : ''}`}>{l}</button>
        ))}
      </div>

      <div className="card overflow-x-auto">
        {status === 'loading' || status === 'idle' ? (
          <div className="flex items-center gap-3 p-8 text-ink-300"><Spinner /> Loading markets…</div>
        ) : status === 'error' ? (
          <div className="p-8 text-down">Couldn’t load markets: {error}</div>
        ) : (
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr>
                <th className="th w-8" />
                {th('name', 'Market')}
                <th className="th text-right">Price</th>
                {th('change', '24h', 'text-right')}
                {th('volume', 'Volume', 'hidden text-right sm:table-cell')}
                {th('funding', 'Funding / h', 'hidden text-right md:table-cell', HELP.funding)}
                {th('oi', 'Open interest', 'hidden text-right lg:table-cell', HELP.oi)}
              </tr>
            </thead>
            <tbody>
              {list.map((m) => <Row key={m.key} m={m} fav={favs.includes(m.key)} onFav={toggle} />)}
              {list.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-ink-400">{tab === 'fav' ? 'Star a market to pin it here.' : 'No markets match.'}</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
