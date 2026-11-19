import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMarkets } from '@/stores/markets'
import { PriceChart } from '@/components/market/PriceChart'
import { PriceCell } from '@/components/market/PriceCell'
import { Help, HELP } from '@/components/ui/Tooltip'
import { fmtPct, fmtPrice, fmtUsd, fundingAnnualPct, fundingHourlyPct, pctChange } from '@/lib/format/numbers'
import { Spinner } from '@/components/ui/Spinner'

export default function Trade() {
  const { coin: rawCoin } = useParams()
  const nav = useNavigate()
  const { status, init, markets, byKey, ctx } = useMarkets()
  useEffect(() => { void init() }, [init])

  const key = rawCoin ? decodeURIComponent(rawCoin) : 'BTC'
  const market = byKey[key]
  const c = ctx[key]

  if (status !== 'ready') return <div className="flex items-center gap-3 p-8 text-ink-300"><Spinner /> Loading market…</div>
  if (!market) return <div className="p-8 text-ink-300">Unknown market “{key}”. <button className="underline" onClick={() => nav('/markets')}>Browse markets</button></div>

  const ch = c ? pctChange(c.mark, c.prevDay) : 0
  return (
    <div className="mx-auto flex max-w-[1800px] flex-col gap-3 p-3">
      <div className="card flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <select aria-label="Select market" className="input w-auto font-semibold" value={key} onChange={(e) => nav(`/trade/${encodeURIComponent(e.target.value)}`)}>
          {markets.map((m) => <option key={m.key} value={m.key}>{m.label}{m.kind === 'spot' ? '' : '-PERP'}{m.kind === 'hip3' ? ` (${m.dex})` : ''}</option>)}
        </select>
        <div><div className="text-[11px] text-ink-400">Mark</div><PriceCell mkey={key} className="text-lg font-semibold" /></div>
        <div><div className="text-[11px] text-ink-400">24h</div><div className={`tabular font-mono ${ch >= 0 ? 'text-up' : 'text-down'}`}>{fmtPct(ch)}</div></div>
        <div><div className="text-[11px] text-ink-400">24h volume</div><div className="tabular font-mono">{fmtUsd(c?.volume, { compact: true })}</div></div>
        {market.kind !== 'spot' && (
          <>
            <div><div className="flex items-center gap-1 text-[11px] text-ink-400">Oracle</div><div className="tabular font-mono">{fmtPrice(c?.oracle)}</div></div>
            <div>
              <div className="flex items-center gap-1 text-[11px] text-ink-400">Funding / h <Help text={HELP.funding} /></div>
              <div className={`tabular font-mono ${(c?.funding ?? 0) >= 0 ? 'text-up' : 'text-down'}`}>{fmtPct(fundingHourlyPct(c?.funding ?? 0), 4)} <span className="text-[11px] text-ink-400">({fmtPct(fundingAnnualPct(c?.funding ?? 0), 1)} APR)</span></div>
            </div>
            <div><div className="flex items-center gap-1 text-[11px] text-ink-400">Open interest <Help text={HELP.oi} /></div><div className="tabular font-mono">{fmtUsd(c?.openInterest, { compact: true })}</div></div>
          </>
        )}
      </div>
      <div className="card h-[520px] overflow-hidden"><PriceChart coin={market.coin} /></div>
    </div>
  )
}
