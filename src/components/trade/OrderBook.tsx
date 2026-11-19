import { memo, useMemo, useState } from 'react'
import { useL2Book } from '@/hooks/useLiveData'
import { fmtPrice, fmtSize, num } from '@/lib/format/numbers'

const ROWS = 12
type Group = 'max' | 5 | 4 | 3

function Side({ levels, kind, max, onPick, szDec }: { levels: { px: string; sz: string; cum: number }[]; kind: 'ask' | 'bid'; max: number; onPick: (px: string) => void; szDec: number }) {
  return (
    <div role="list">
      {levels.map((l) => (
        <button key={l.px} role="listitem" onClick={() => onPick(l.px)} className="relative flex w-full items-center justify-between px-3 py-[3px] text-xs hover:bg-ink-800">
          <span aria-hidden className={`absolute inset-y-0 right-0 ${kind === 'ask' ? 'bg-down/12' : 'bg-up/12'}`} style={{ width: `${Math.min(100, (l.cum / max) * 100)}%` }} />
          <span className={`tabular relative font-mono ${kind === 'ask' ? 'text-down' : 'text-up'}`}>{fmtPrice(num(l.px))}</span>
          <span className="tabular relative font-mono text-ink-200">{fmtSize(num(l.sz), szDec)}</span>
          <span className="tabular relative hidden font-mono text-ink-400 sm:inline">{fmtSize(l.cum, szDec)}</span>
        </button>
      ))}
    </div>
  )
}

function OrderBookBase({ coin, szDecimals, onPickPrice }: { coin: string; szDecimals: number; onPickPrice: (px: string) => void }) {
  const [group, setGroup] = useState<Group>('max')
  const book = useL2Book(coin, group === 'max' ? null : group)

  const view = useMemo(() => {
    if (!book) return null
    const [bids, asks] = book.levels
    let cum = 0
    const a = asks.slice(0, ROWS).map((l) => ({ ...l, cum: (cum += num(l.sz)) }))
    const askMax = cum
    cum = 0
    const b = bids.slice(0, ROWS).map((l) => ({ ...l, cum: (cum += num(l.sz)) }))
    const max = Math.max(askMax, cum, 1e-9)
    const spread = asks[0] && bids[0] ? num(asks[0].px) - num(bids[0].px) : null
    const mid = asks[0] && bids[0] ? (num(asks[0].px) + num(bids[0].px)) / 2 : null
    return { a: a.reverse(), b, max, spread, mid }
  }, [book])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-700/70 px-3 py-2">
        <span className="text-xs font-semibold text-ink-200">Order book</span>
        <select aria-label="Price grouping" className="rounded bg-ink-800 px-1.5 py-0.5 text-xs text-ink-200" value={String(group)} onChange={(e) => setGroup(e.target.value === 'max' ? 'max' : (Number(e.target.value) as Group))}>
          <option value="max">Max precision</option><option value="5">5 sig figs</option><option value="4">4 sig figs</option><option value="3">3 sig figs</option>
        </select>
      </div>
      <div className="flex justify-between px-3 py-1 text-[10px] uppercase tracking-wide text-ink-400"><span>Price</span><span>Size</span><span className="hidden sm:inline">Total</span></div>
      {!view ? <div className="p-4 text-xs text-ink-400">Loading…</div> : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <Side levels={view.a} kind="ask" max={view.max} onPick={onPickPrice} szDec={szDecimals} />
          <div className="my-1 flex items-center justify-between border-y border-ink-800 px-3 py-1 text-xs">
            <span className="tabular font-mono font-semibold">{fmtPrice(view.mid)}</span>
            <span className="tabular font-mono text-ink-400">Spread {view.spread !== null ? fmtPrice(view.spread) : '—'}</span>
          </div>
          <Side levels={view.b} kind="bid" max={view.max} onPick={onPickPrice} szDec={szDecimals} />
        </div>
      )}
    </div>
  )
}
export const OrderBook = memo(OrderBookBase)
