import { memo } from 'react'
import { useRecentTrades } from '@/hooks/useLiveData'
import { fmtPrice, fmtSize, num } from '@/lib/format/numbers'

function RecentTradesBase({ coin, szDecimals }: { coin: string; szDecimals: number }) {
  const trades = useRecentTrades(coin)
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-ink-700/70 px-3 py-2 text-xs font-semibold text-ink-200">Recent trades</div>
      <div className="flex justify-between px-3 py-1 text-[10px] uppercase tracking-wide text-ink-400"><span>Price</span><span>Size</span><span>Time</span></div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {trades.length === 0 && <div className="p-4 text-xs text-ink-400">Waiting for trades…</div>}
        {trades.map((t) => (
          <div key={t.tid} className="flex justify-between px-3 py-[3px] text-xs">
            <span className={`tabular font-mono ${t.side === 'B' ? 'text-up' : 'text-down'}`}>{fmtPrice(num(t.px))}</span>
            <span className="tabular font-mono text-ink-200">{fmtSize(num(t.sz), szDecimals)}</span>
            <span className="tabular font-mono text-ink-400">{new Date(t.time).toLocaleTimeString([], { hour12: false })}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
export const RecentTrades = memo(RecentTradesBase)
