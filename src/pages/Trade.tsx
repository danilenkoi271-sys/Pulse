import { memo, useEffect, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useMarkets } from '@/stores/markets'
import { useUi } from '@/stores/ui'
import { PriceChart } from '@/components/market/PriceChart'
import { PriceCell } from '@/components/market/PriceCell'
import { OrderBook } from '@/components/trade/OrderBook'
import { RecentTrades } from '@/components/trade/RecentTrades'
import { OrderTicket } from '@/components/trade/OrderTicket'
import { AccountPanel } from '@/components/account/AccountPanel'
import { Help, HELP } from '@/components/ui/Tooltip'
import { Spinner } from '@/components/ui/Spinner'
import { fmtPct, fmtPrice, fmtUsd, fundingAnnualPct, fundingHourlyPct, pctChange } from '@/lib/format/numbers'

const Stat = ({ k, help, children, cls = '' }: { k: string; help?: string; children: React.ReactNode; cls?: string }) => (
  <div className={`flex flex-col justify-center gap-1 border-l border-line px-4 py-2 ${cls}`}>
    <span className="k flex items-center gap-1.5">{k}{help && <Help text={help} />}</span>
    <span className="num text-[13px] text-bone">{children}</span>
  </div>
)

const BookTabs = memo(function BookTabs({ coin, szDecimals, onPick }: { coin: string; szDecimals: number; onPick: (px: string) => void }) {
  const [tab, setTab] = useState<'book' | 'trades'>('book')
  return (
    <div className="flex h-full flex-col">
      <div className="flex border-b border-line xl:hidden" role="tablist">
        {(['book', 'trades'] as const).map((t) => <button key={t} role="tab" aria-selected={tab === t} className="tab" onClick={() => setTab(t)}>{t === 'book' ? 'Book' : 'Tape'}</button>)}
      </div>
      {/* xl: stacked together · smaller: tabbed */}
      <div className={`min-h-0 flex-1 xl:flex-[3] ${tab === 'book' ? '' : 'hidden xl:block'}`}><OrderBook coin={coin} szDecimals={szDecimals} onPickPrice={onPick} /></div>
      <div className={`min-h-0 flex-1 border-line xl:flex-[2] xl:border-t ${tab === 'trades' ? '' : 'hidden xl:block'}`}><RecentTrades coin={coin} szDecimals={szDecimals} /></div>
    </div>
  )
})

export default function Trade() {
  const { coin: rawCoin } = useParams()
  const nav = useNavigate()
  const openPicker = useUi((s) => s.openPicker)
  const { geoBlocked } = useOutletContext<{ geoBlocked: boolean }>() ?? { geoBlocked: false }
  const { status, init, byKey, ctx } = useMarkets()
  const [picked, setPicked] = useState<{ px: string; n: number } | null>(null)
  useEffect(() => { void init() }, [init])

  const key = rawCoin ? decodeURIComponent(rawCoin) : 'BTC'
  const market = byKey[key]
  const c = ctx[key]

  if (status !== 'ready') return <div className="flex items-center gap-3 p-10"><Spinner /><span className="k">Loading market…</span></div>
  if (!market) return <div className="p-10 font-mono text-[12px] text-mute">Unknown market “{key}”. <button className="text-lime underline" onClick={() => nav('/markets')}>Browse the board</button></div>

  const ch = c ? pctChange(c.mark, c.prevDay) : 0
  return (
    <div className="grid gap-px border-b border-line bg-line xl:grid-cols-[minmax(0,1fr)_290px_330px] xl:grid-rows-[auto_540px_minmax(260px,1fr)]">
      {/* market bar */}
      <div className="flex flex-wrap items-stretch bg-plate xl:col-span-3">
        <button onClick={openPicker} className="group flex items-center gap-3 px-4 py-2 text-left hover:bg-raise" aria-label="Change market">
          <span>
            <span className="display text-[34px] leading-none text-bone group-hover:text-lime">{market.label}</span>
            <span className="k ml-2">{market.kind === 'spot' ? 'spot' : market.kind === 'hip3' ? `${market.dex} perp` : 'perp'}</span>
          </span>
          <span className="k text-lime">▼ switch /</span>
        </button>
        <div className="flex flex-col justify-center gap-0.5 border-l border-line px-4 py-2">
          <PriceCell mkey={key} className="text-[22px] font-semibold leading-none text-bone" />
          <span className={`num text-[11px] ${ch >= 0 ? 'text-up' : 'text-down'}`}>{ch >= 0 ? '▲' : '▼'} {fmtPct(Math.abs(ch))} · 24h</span>
        </div>
        <Stat k="24h volume" cls="hidden sm:flex">{fmtUsd(c?.volume, { compact: true })}</Stat>
        {market.kind !== 'spot' && (
          <>
            <Stat k="Oracle" cls="hidden md:flex">{fmtPrice(c?.oracle)}</Stat>
            <Stat k="Funding / h" help={HELP.funding}><span className={(c?.funding ?? 0) >= 0 ? 'text-up' : 'text-down'}>{fmtPct(fundingHourlyPct(c?.funding ?? 0), 4)}</span> <span className="hidden text-[10px] text-dim lg:inline">{fmtPct(fundingAnnualPct(c?.funding ?? 0), 1)} apr</span></Stat>
            <Stat k="Open interest" help={HELP.oi} cls="hidden md:flex">{fmtUsd(c?.openInterest, { compact: true })}</Stat>
          </>
        )}
      </div>

      <div className="order-1 flex h-[420px] min-h-0 flex-col bg-plate sm:h-[480px] xl:h-auto">
        <div className="plate-h"><span className="idx">01</span><span className="k !text-bone">Chart</span><span className="k ml-auto">{market.coin}</span></div>
        <div className="min-h-0 flex-1"><PriceChart coin={market.coin} /></div>
      </div>
      <div className="order-3 h-[520px] bg-plate md:order-2 xl:row-span-2 xl:h-auto">
        <BookTabs coin={market.coin} szDecimals={market.szDecimals} onPick={(px) => setPicked({ px, n: Date.now() })} />
      </div>
      <div className="order-2 bg-plate md:order-3 xl:row-span-2 xl:overflow-y-auto"><OrderTicket market={market} ctx={c} pickedPrice={picked} geoBlocked={geoBlocked} /></div>
      <div className="order-4 bg-plate md:col-span-2 xl:col-span-1"><AccountPanel /></div>
    </div>
  )
}
