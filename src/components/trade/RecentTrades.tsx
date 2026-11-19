import { memo } from 'react'
import { useRecentTrades } from '@/hooks/useLiveData'
import { fmtPrice, fmtSize, num } from '@/lib/format/numbers'

function RecentTradesBase({ coin, szDecimals }: { coin: string; szDecimals: number }) {
  const trades = useRecentTrades(coin)
  return (
    <div className="flex h-full flex-col">
      <div className="plate-h"><span className="idx">03</span><span className="k !text-bone">Tape</span></div>
      <div className="grid grid-cols-3 px-3 py-1.5"><span className="k">Price</span><span className="k text-right">Size</span><span className="k text-right">Time</span></div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {trades.length === 0 && <div className="p-4 font-mono text-[11px] text-dim">Waiting for prints…</div>}
        {trades.map((t) => (
          <div key={t.tid} className="grid grid-cols-3 px-3 py-[3px]">
            <span className={`num text-[12px] ${t.side === 'B' ? 'text-up' : 'text-down'}`}>{t.side === 'B' ? '▲' : '▼'} {fmtPrice(num(t.px))}</span>
            <span className="num text-right text-[12px] text-text">{fmtSize(num(t.sz), szDecimals)}</span>
            <span className="num text-right text-[12px] text-dim">{new Date(t.time).toLocaleTimeString([], { hour12: false })}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
export const RecentTrades = memo(RecentTradesBase)
