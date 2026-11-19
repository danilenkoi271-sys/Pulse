import { memo, useMemo, useState } from 'react'
import { useL2Book } from '@/hooks/useLiveData'
import { Dropdown } from '@/components/ui/Dropdown'
import { fmtPrice, fmtSize, num } from '@/lib/format/numbers'

const ROWS = 13
type Group = 'max' | '5' | '4' | '3'

function Side({ levels, kind, max, onPick, szDec }: { levels: { px: string; sz: string; cum: number }[]; kind: 'ask' | 'bid'; max: number; onPick: (px: string) => void; szDec: number }) {
  return (
    <div role="list">
      {levels.map((l) => (
        <button key={l.px} role="listitem" onClick={() => onPick(l.px)} className="group relative grid w-full grid-cols-3 px-3 py-[3px] text-left hover:bg-raise">
          <span aria-hidden className={`absolute inset-y-px right-0 ${kind === 'ask' ? 'hatch-down' : 'hatch-up'}`} style={{ width: `${Math.min(100, (l.cum / max) * 100)}%` }} />
          <span className={`num relative text-[12px] ${kind === 'ask' ? 'text-down' : 'text-up'}`}>{fmtPrice(num(l.px))}</span>
          <span className="num relative text-right text-[12px] text-text">{fmtSize(num(l.sz), szDec)}</span>
          <span className="num relative text-right text-[12px] text-dim">{fmtSize(l.cum, szDec)}</span>
        </button>
      ))}
    </div>
  )
}

function OrderBookBase({ coin, szDecimals, onPickPrice }: { coin: string; szDecimals: number; onPickPrice: (px: string) => void }) {
  const [group, setGroup] = useState<Group>('max')
  const book = useL2Book(coin, group === 'max' ? null : (Number(group) as 3 | 4 | 5))

  const view = useMemo(() => {
    if (!book) return null
    const [bids, asks] = book.levels
    let cum = 0
    const a = asks.slice(0, ROWS).map((l) => ({ ...l, cum: (cum += num(l.sz)) }))
    const askMax = cum
    cum = 0
    const b = bids.slice(0, ROWS).map((l) => ({ ...l, cum: (cum += num(l.sz)) }))
    const spread = asks[0] && bids[0] ? num(asks[0].px) - num(bids[0].px) : null
    const mid = asks[0] && bids[0] ? (num(asks[0].px) + num(bids[0].px)) / 2 : null
    return { a: a.reverse(), b, max: Math.max(askMax, cum, 1e-9), spread, mid, spreadPct: spread && mid ? (spread / mid) * 100 : null }
  }, [book])

  return (
    <div className="flex h-full flex-col">
      <div className="plate-h">
        <span className="idx">02</span><span className="k !text-bone">Book</span>
        <Dropdown compact className="ml-auto w-24" label="Price grouping" value={group} onChange={setGroup} options={[{ value: 'max', label: 'Full' }, { value: '5', label: '5 sig' }, { value: '4', label: '4 sig' }, { value: '3', label: '3 sig' }]} />
      </div>
      <div className="grid grid-cols-3 px-3 py-1.5"><span className="k">Price</span><span className="k text-right">Size</span><span className="k text-right">Total</span></div>
      {!view ? <div className="p-4 font-mono text-[11px] text-dim">Loading…</div> : (
        <div className="min-h-0 flex-1 overflow-hidden">
          <Side levels={view.a} kind="ask" max={view.max} onPick={onPickPrice} szDec={szDecimals} />
          <div className="my-1 flex items-center justify-between border-y border-line bg-void px-3 py-1.5">
            <span className="num text-[14px] font-semibold text-bone">{fmtPrice(view.mid)}</span>
            <span className="k">spread {view.spread !== null ? fmtPrice(view.spread) : '—'}{view.spreadPct !== null ? ` · ${view.spreadPct.toFixed(3)}%` : ''}</span>
          </div>
          <Side levels={view.b} kind="bid" max={view.max} onPick={onPickPrice} szDec={szDecimals} />
        </div>
      )}
    </div>
  )
}
export const OrderBook = memo(OrderBookBase)
