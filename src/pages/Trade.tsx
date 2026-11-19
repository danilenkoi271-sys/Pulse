import { memo, useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useMarkets } from '@/stores/markets'
import { PriceChart } from '@/components/market/PriceChart'
import { PriceCell } from '@/components/market/PriceCell'
import { OrderBook } from '@/components/trade/OrderBook'
import { RecentTrades } from '@/components/trade/RecentTrades'
import { OrderTicket } from '@/components/trade/OrderTicket'
import { AccountPanel } from '@/components/account/AccountPanel'
import { Help, HELP } from '@/components/ui/Tooltip'
import { Spinner } from '@/components/ui/Spinner'
import { fmtPct, fmtPrice, fmtUsd, fundingAnnualPct, fundingHourlyPct, pctChange } from '@/lib/format/numbers'

const BookTabs = memo(function BookTabs({ coin, szDecimals, onPick }: { coin: string; szDecimals: number; onPick: (px: string) => void }) {
  const [tab, setTab] = useState<'book' | 'trades'>('book')
  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-1 border-b border-ink-700/70 p-1.5 xl:hidden">
        {(['book', 'trades'] as const).map((t) => <button key={t} className={`chip capitalize ${tab === t ? 'chip-active' : ''}`} onClick={() => setTab(t)}>{t === 'book' ? 'Order book' : 'Trades'}</button>)}
      </div>
      {/* xl: both stacked; below xl: tabbed */}
      <div className={`min-h-0 flex-1 xl:flex-[3] ${tab === 'book' ? '' : 'hidden xl:block'}`}><OrderBook coin={coin} szDecimals={szDecimals} onPickPrice={onPick} /></div>
      <div className={`min-h-0 flex-1 border-ink-700/70 xl:flex-[2] xl:border-t ${tab === 'trades' ? '' : 'hidden xl:block'}`}><RecentTrades coin={coin} szDecimals={szDecimals} /></div>
    </div>
  )
})

export default function Trade() {
  const { coin: rawCoin } = useParams()
  const nav = useNavigate()
  const { geoBlocked } = useOutletContext<{ geoBlocked: boolean }>() ?? { geoBlocked: false }
  const { status, init, markets, byKey, ctx } = useMarkets()
  const [picked, setPicked] = useState<{ px: string; n: number } | null>(null)
  useEffect(() => { void init() }, [init])

  const key = rawCoin ? decodeURIComponent(rawCoin) : 'BTC'
  const market = byKey[key]
  const c = ctx[key]

  if (status !== 'ready') return <div className="flex items-center gap-3 p-8 text-ink-300"><Spinner /> Loading market…</div>
  if (!market) return <div className="p-8 text-ink-300">Unknown market “{key}”. <button className="underline" onClick={() => nav('/markets')}>Browse markets</button></div>

  const ch = c ? pctChange(c.mark, c.prevDay) : 0
  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-3 p-2 sm:p-3">
      <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <select aria-label="Select market" className="input w-auto font-semibold" value={key} onChange={(e) => nav(`/trade/${encodeURIComponent(e.target.value)}`)}>
          {markets.map((m) => <option key={m.key} value={m.key}>{m.label}{m.kind === 'spot' ? '' : '-PERP'}{m.kind === 'hip3' ? ` (${m.dex})` : ''}</option>)}
        </select>
        <div><div className="text-[11px] text-ink-400">Mark</div><PriceCell mkey={key} className="text-lg font-semibold" /></div>
        <div><div className="text-[11px] text-ink-400">24h</div><div className={`tabular font-mono ${ch >= 0 ? 'text-up' : 'text-down'}`}>{fmtPct(ch)}</div></div>
        <div><div className="text-[11px] text-ink-400">24h volume</div><div className="tabular font-mono">{fmtUsd(c?.volume, { compact: true })}</div></div>
        {market.kind !== 'spot' && (
          <>
            <div className="hidden sm:block"><div className="text-[11px] text-ink-400">Oracle</div><div className="tabular font-mono">{fmtPrice(c?.oracle)}</div></div>
            <div>
              <div className="flex items-center gap-1 text-[11px] text-ink-400">Funding / h <Help text={HELP.funding} /></div>
              <div className={`tabular font-mono ${(c?.funding ?? 0) >= 0 ? 'text-up' : 'text-down'}`}>{fmtPct(fundingHourlyPct(c?.funding ?? 0), 4)} <span className="hidden text-[11px] text-ink-400 sm:inline">({fmtPct(fundingAnnualPct(c?.funding ?? 0), 1)} APR)</span></div>
            </div>
            <div className="hidden md:block"><div className="flex items-center gap-1 text-[11px] text-ink-400">Open interest <Help text={HELP.oi} /></div><div className="tabular font-mono">{fmtUsd(c?.openInterest, { compact: true })}</div></div>
          </>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_290px_330px] xl:grid-rows-[520px_1fr]">
        <div className="card order-1 h-[440px] overflow-hidden md:col-span-2 xl:col-span-1 xl:h-[520px]"><PriceChart coin={market.coin} /></div>
        <div className="card order-3 h-[520px] overflow-hidden md:order-2 xl:row-span-2 xl:h-auto xl:min-h-[740px]">
          <BookTabs coin={market.coin} szDecimals={market.szDecimals} onPick={(px) => setPicked({ px, n: Date.now() })} />
        </div>
        <div className="card order-2 overflow-y-auto md:order-3 xl:row-span-2"><OrderTicket market={market} ctx={c} pickedPrice={picked} geoBlocked={geoBlocked} /></div>
        <div className="card order-4 md:col-span-2 xl:col-span-1"><AccountPanel /></div>
      </div>
    </div>
  )
}
