import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarkets } from '@/stores/markets'
import { useFavorites } from '@/stores/favorites'
import { useUi } from '@/stores/ui'
import { fmtPct, fmtPrice, pctChange } from '@/lib/format/numbers'
import type { Market } from '@/lib/hl/types'

type Scope = 'all' | 'perp' | 'hip3' | 'spot' | 'fav'

/** Header button; also opens on "/" anywhere (when not typing). */
export function MarketPickerTrigger() {
  const open = useUi((s) => s.openPicker)
  const isOpen = useUi((s) => s.pickerOpen)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(t.tagName) && !t.isContentEditable) { e.preventDefault(); open() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open])
  return (
    <>
      <button onClick={open} className="btn btn-sm hidden sm:inline-flex" aria-label="Search markets"><span className="text-lime">/</span> Search</button>
      <button onClick={open} className="btn btn-sm sm:hidden" aria-label="Search markets">Find</button>
      {isOpen && <MarketPicker />}
    </>
  )
}

function MarketPicker() {
  const close = useUi((s) => s.closePicker)
  const nav = useNavigate()
  const { markets, ctx, status } = useMarkets()
  const { favs, toggle } = useFavorites()
  const [q, setQ] = useState('')
  const [scope, setScope] = useState<Scope>('all')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    const pool = markets.filter((m) => (scope === 'all' ? true : scope === 'fav' ? favs.includes(m.key) : m.kind === scope) && (!term || m.label.toLowerCase().includes(term) || m.key.toLowerCase().includes(term)))
    // prefix matches first, then by volume
    return pool.sort((a, b) => {
      const ap = term && a.label.toLowerCase().startsWith(term) ? 1 : 0
      const bp = term && b.label.toLowerCase().startsWith(term) ? 1 : 0
      return bp - ap || (ctx[b.key]?.volume ?? 0) - (ctx[a.key]?.volume ?? 0)
    }).slice(0, 80)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markets, q, scope, favs, status])

  useEffect(() => setActive(0), [q, scope])
  useEffect(() => { listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' }) }, [active])

  const go = (m: Market) => { close(); nav(`/trade/${encodeURIComponent(m.key)}`) }
  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close()
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(rows.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter' && rows[active]) go(rows[active])
  }
  const scopes: [Scope, string][] = [['all', 'All'], ['perp', 'Perps'], ['hip3', 'Stocks/Cmdty'], ['spot', 'Spot'], ['fav', '★']]

  return (
    <div className="fixed inset-0 z-[65] grid place-items-start bg-void/85 p-0 pt-0 sm:p-6 sm:pt-[10vh]" onMouseDown={(e) => e.target === e.currentTarget && close()} role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Find a market" onKeyDown={key} className="ticks mx-auto flex max-h-[80vh] w-full max-w-xl flex-col border border-line2 shadow-[0_30px_80px_rgba(0,0,0,.75)]">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <span className="font-mono text-lime">/</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="BTC, TSLA, GOLD, HYPE…" aria-label="Search markets" className="h-12 flex-1 bg-transparent font-mono text-[14px] text-bone placeholder:text-dim focus:outline-none" />
          <button onClick={close} className="k hover:text-bone">Esc</button>
        </div>
        <div className="flex border-b border-line">{scopes.map(([s, l]) => <button key={s} role="tab" aria-selected={scope === s} className="tab" onClick={() => setScope(s)}>{l}</button>)}</div>
        <ul ref={listRef} role="listbox" className="min-h-0 flex-1 overflow-y-auto">
          {rows.length === 0 && <li className="p-6 text-center font-mono text-[12px] text-dim">{status !== 'ready' ? 'Loading markets…' : 'Nothing matches.'}</li>}
          {rows.map((m, i) => {
            const c = ctx[m.key]
            const ch = c ? pctChange(c.mark, c.prevDay) : 0
            return (
              <li key={m.key} role="option" aria-selected={i === active} data-active={i === active} onMouseEnter={() => setActive(i)} onClick={() => go(m)}
                className={`flex cursor-pointer items-center gap-3 border-l-2 px-4 py-2.5 ${i === active ? 'border-lime bg-raise' : 'border-transparent'}`}>
                <button aria-label="Toggle favourite" onClick={(e) => { e.stopPropagation(); toggle(m.key) }} className={favs.includes(m.key) ? 'text-lime' : 'text-line2 hover:text-mute'}>★</button>
                <span className="font-mono text-[13px] font-semibold text-bone">{m.label}</span>
                <span className="k">{m.kind === 'spot' ? 'spot' : m.kind === 'hip3' ? m.dex : 'perp'}</span>
                <span className="num ml-auto text-[12px] text-text">{fmtPrice(c?.mark)}</span>
                <span className={`num w-16 text-right text-[11px] ${ch >= 0 ? 'text-up' : 'text-down'}`}>{fmtPct(ch)}</span>
              </li>
            )
          })}
        </ul>
        <div className="flex gap-4 border-t border-line px-4 py-2"><span className="k">↑↓ move</span><span className="k">↵ open</span><span className="k">esc close</span></div>
      </div>
    </div>
  )
}
