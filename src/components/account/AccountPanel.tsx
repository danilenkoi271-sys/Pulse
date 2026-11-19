import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccount, type Position } from '@/stores/account'
import { useMarkets } from '@/stores/markets'
import { usePending } from '@/stores/pendingOrders'
import { useOrderActions } from '@/hooks/useOrderActions'
import { useWalletApi } from '@/wallet/context'
import { Help, HELP } from '@/components/ui/Tooltip'
import { fmtPct, fmtPrice, fmtSize, fmtUsd, num } from '@/lib/format/numbers'

type Tab = 'positions' | 'orders' | 'history' | 'fills' | 'balances'

const pnlCls = (v: number) => (v > 0 ? 'text-up' : v < 0 ? 'text-down' : 'text-ink-200')
const time = (t: number) => new Date(t).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
const labelOf = (coin: string) => useMarkets.getState().byKey[coin]?.label ?? coin

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="p-6 text-center text-sm text-ink-400">{children}</div>
}

const PositionRow = memo(function PositionRow({ p, onClose, busy }: { p: Position; onClose: (p: Position) => void; busy: boolean }) {
  const m = useMarkets((s) => s.byKey[p.coin])
  const mark = useMarkets((s) => s.ctx[p.coin]?.mark ?? 0)
  const long = p.size > 0
  const liqDist = p.liquidationPx && mark ? Math.abs(mark - p.liquidationPx) / mark : null
  return (
    <tr className="border-t border-ink-800">
      <td className="whitespace-nowrap px-3 py-2.5">
        <Link to={`/trade/${encodeURIComponent(p.coin)}`} className="font-semibold hover:text-pulse-300">{m?.label ?? p.coin}</Link>
        <span className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${long ? 'bg-up/15 text-up' : 'bg-down/15 text-down'}`}>{long ? 'LONG' : 'SHORT'} {p.leverage.value}x {p.leverage.type === 'cross' ? 'Cross' : 'Iso'}</span>
      </td>
      <td className="tabular px-3 py-2.5 text-right font-mono">{fmtSize(Math.abs(p.size), m?.szDecimals ?? 4)}</td>
      <td className="tabular px-3 py-2.5 text-right font-mono">{fmtUsd(p.positionValue)}</td>
      <td className="tabular px-3 py-2.5 text-right font-mono">{fmtPrice(p.entryPx)}</td>
      <td className="tabular px-3 py-2.5 text-right font-mono">{fmtPrice(mark)}</td>
      <td className={`tabular px-3 py-2.5 text-right font-mono ${liqDist !== null && liqDist < 0.1 ? 'text-warn' : ''}`}>{p.liquidationPx ? fmtPrice(p.liquidationPx) : '—'}</td>
      <td className="tabular px-3 py-2.5 text-right font-mono">{fmtUsd(p.marginUsed)}</td>
      <td className={`tabular px-3 py-2.5 text-right font-mono ${pnlCls(p.unrealizedPnl)}`}>{fmtUsd(p.unrealizedPnl, { sign: true })} <span className="text-[11px]">({fmtPct(p.roe * 100, 1)})</span></td>
      <td className="px-3 py-2.5 text-right"><button className="btn-ghost px-2.5 py-1 text-xs" disabled={busy} onClick={() => onClose(p)}>Close</button></td>
    </tr>
  )
})

function AccountPanelBase() {
  const wallet = useWalletApi()
  const { positions, openOrders, history, fills, spot, dexSummary, mode, loaded, address } = useAccount()
  const hasAccount = wallet.authenticated || !!address // `address` is also set by the dev-only ?viewAs= preview
  const pending = usePending((s) => s.items)
  const { closePosition, cancel, cancelAll } = useOrderActions()
  const [tab, setTab] = useState<Tab>('positions')
  const [busy, setBusy] = useState<string | null>(null)

  const close = async (p: Position) => {
    const m = useMarkets.getState().byKey[p.coin]
    const mark = useMarkets.getState().ctx[p.coin]?.mark
    if (!m || !mark) return
    setBusy(p.coin)
    await closePosition(p, m, mark)
    setBusy(null)
  }

  const totalPnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0)
  const realized = fills.reduce((s, f) => s + num(f.closedPnl), 0)
  const openCount = openOrders.length + pending.filter((p) => p.status === 'pending').length

  const tabs: [Tab, string][] = [
    ['positions', `Positions${positions.length ? ` (${positions.length})` : ''}`],
    ['orders', `Open orders${openCount ? ` (${openCount})` : ''}`],
    ['history', 'Order history'],
    ['fills', 'Fills'],
    ['balances', 'Balances'],
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-ink-700/70 px-2 py-1.5">
        {tabs.map(([k, l]) => <button key={k} className={`chip whitespace-nowrap ${tab === k ? 'chip-active' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
        {hasAccount && (
          <span className="ml-auto hidden whitespace-nowrap pr-2 text-xs text-ink-400 sm:block">
            Unrealized <b className={`tabular font-mono ${pnlCls(totalPnl)}`}>{fmtUsd(totalPnl, { sign: true })}</b> · Realized (recent) <b className={`tabular font-mono ${pnlCls(realized)}`}>{fmtUsd(realized, { sign: true })}</b>
          </span>
        )}
      </div>

      <div className="min-h-[160px] flex-1 overflow-auto">
        {!hasAccount ? (
          <Empty>Connect your wallet to see positions, orders and history.</Empty>
        ) : tab === 'positions' ? (
          !loaded ? <Empty>Loading…</Empty> : positions.length === 0 ? <Empty>No open positions.</Empty> : (
            <table className="w-full min-w-[860px] text-sm">
              <thead><tr><th className="th">Market</th><th className="th text-right">Size</th><th className="th text-right">Value</th><th className="th text-right">Entry</th><th className="th text-right">Mark</th>
                <th className="th text-right"><span className="inline-flex items-center gap-1">Liq. price <Help text={HELP.liquidation} /></span></th><th className="th text-right">Margin</th><th className="th text-right">PnL (ROE)</th><th className="th" /></tr></thead>
              <tbody>{positions.map((p) => <PositionRow key={`${p.dex}:${p.coin}`} p={p} onClose={close} busy={busy === p.coin} />)}</tbody>
            </table>
          )
        ) : tab === 'orders' ? (
          openOrders.length === 0 && pending.length === 0 ? <Empty>No open orders.</Empty> : (
            <>
              {openOrders.length > 1 && <div className="flex justify-end px-3 pt-2"><button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => void cancelAll(openOrders)}>Cancel all</button></div>}
              <table className="w-full min-w-[640px] text-sm">
                <thead><tr><th className="th">Time</th><th className="th">Market</th><th className="th">Type</th><th className="th text-right">Size</th><th className="th text-right">Price</th><th className="th">Status</th><th className="th" /></tr></thead>
                <tbody>
                  {pending.map((p) => (
                    <tr key={p.id} className="border-t border-ink-800 bg-ink-850/60">
                      <td className="px-3 py-2.5 text-ink-300">{time(p.ts)}</td>
                      <td className="px-3 py-2.5 font-semibold">{p.label}</td>
                      <td className={`px-3 py-2.5 ${p.side === 'buy' ? 'text-up' : 'text-down'}`}>{p.side === 'buy' ? 'Buy' : 'Sell'} {p.kind}</td>
                      <td className="tabular px-3 py-2.5 text-right font-mono">{p.size}</td>
                      <td className="tabular px-3 py-2.5 text-right font-mono">{p.kind === 'market' ? 'Market' : p.price}</td>
                      <td className="px-3 py-2.5 text-xs">
                        {p.status === 'pending' && <span className="text-warn">Pending…</span>}
                        {p.status === 'confirmed' && <span className="text-up">Confirmed</span>}
                        {p.status === 'rejected' && <span className="text-down" title={p.detail}>Rejected: {p.detail}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">{p.status === 'rejected' && <button className="text-xs text-ink-400 hover:text-white" onClick={() => usePending.getState().dismiss(p.id)}>Dismiss</button>}</td>
                    </tr>
                  ))}
                  {openOrders.map((o) => (
                    <tr key={o.oid} className="border-t border-ink-800">
                      <td className="px-3 py-2.5 text-ink-300">{time(o.timestamp)}</td>
                      <td className="px-3 py-2.5 font-semibold">{labelOf(o.coin)}</td>
                      <td className={`px-3 py-2.5 ${o.side === 'B' ? 'text-up' : 'text-down'}`}>{o.side === 'B' ? 'Buy' : 'Sell'} {o.orderType}{o.reduceOnly ? ' · RO' : ''}</td>
                      <td className="tabular px-3 py-2.5 text-right font-mono">{o.sz}</td>
                      <td className="tabular px-3 py-2.5 text-right font-mono">{o.isTrigger ? o.triggerCondition : fmtPrice(num(o.limitPx))}</td>
                      <td className="px-3 py-2.5 text-xs text-ink-300">Open</td>
                      <td className="px-3 py-2.5 text-right"><button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => void cancel(o)}>Cancel</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        ) : tab === 'history' ? (
          history.length === 0 ? <Empty>No order history yet.</Empty> : (
            <table className="w-full min-w-[640px] text-sm">
              <thead><tr><th className="th">Time</th><th className="th">Market</th><th className="th">Type</th><th className="th text-right">Size</th><th className="th text-right">Price</th><th className="th">Status</th></tr></thead>
              <tbody>{history.slice(0, 100).map((h) => (
                <tr key={`${h.order.oid}-${h.statusTimestamp}`} className="border-t border-ink-800">
                  <td className="px-3 py-2.5 text-ink-300">{time(h.statusTimestamp)}</td>
                  <td className="px-3 py-2.5 font-semibold">{labelOf(h.order.coin)}</td>
                  <td className={`px-3 py-2.5 ${h.order.side === 'B' ? 'text-up' : 'text-down'}`}>{h.order.side === 'B' ? 'Buy' : 'Sell'} {h.order.orderType}</td>
                  <td className="tabular px-3 py-2.5 text-right font-mono">{h.order.origSz}</td>
                  <td className="tabular px-3 py-2.5 text-right font-mono">{fmtPrice(num(h.order.limitPx))}</td>
                  <td className="px-3 py-2.5 text-xs capitalize text-ink-300">{String(h.status).replace(/([A-Z])/g, ' $1').toLowerCase()}</td>
                </tr>))}</tbody>
            </table>
          )
        ) : tab === 'fills' ? (
          fills.length === 0 ? <Empty>No fills yet.</Empty> : (
            <table className="w-full min-w-[720px] text-sm">
              <thead><tr><th className="th">Time</th><th className="th">Market</th><th className="th">Direction</th><th className="th text-right">Price</th><th className="th text-right">Size</th><th className="th text-right">Fee</th><th className="th text-right">Closed PnL</th></tr></thead>
              <tbody>{fills.slice(0, 100).map((f) => (
                <tr key={`${f.hash}:${f.tid}`} className="border-t border-ink-800">
                  <td className="px-3 py-2.5 text-ink-300">{time(f.time)}</td>
                  <td className="px-3 py-2.5 font-semibold">{labelOf(f.coin)}</td>
                  <td className={`px-3 py-2.5 ${f.side === 'B' ? 'text-up' : 'text-down'}`}>{f.dir}</td>
                  <td className="tabular px-3 py-2.5 text-right font-mono">{fmtPrice(num(f.px))}</td>
                  <td className="tabular px-3 py-2.5 text-right font-mono">{f.sz}</td>
                  <td className="tabular px-3 py-2.5 text-right font-mono text-ink-300">{fmtUsd(num(f.fee))}</td>
                  <td className={`tabular px-3 py-2.5 text-right font-mono ${pnlCls(num(f.closedPnl))}`}>{num(f.closedPnl) ? fmtUsd(num(f.closedPnl), { sign: true }) : '—'}</td>
                </tr>))}</tbody>
            </table>
          )
        ) : (
          <div className="space-y-4 p-4 text-sm">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Perps accounts {mode && <span className="ml-1 normal-case text-ink-500">({mode === 'default' || mode === 'disabled' ? 'standard' : mode === 'unifiedAccount' ? 'unified' : 'portfolio margin'} mode)</span>}</h3>
              {Object.entries(dexSummary).map(([dex, s]) => (
                <div key={dex} className="flex justify-between border-t border-ink-800 py-2 first:border-t-0">
                  <span>{dex || 'Main (USDC)'}</span>
                  <span className="tabular font-mono">{fmtUsd(s.accountValue)} <span className="text-ink-400">· withdrawable {fmtUsd(s.withdrawable)}</span></span>
                </div>
              ))}
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Spot balances</h3>
              {spot.filter((b) => num(b.total) > 0).length === 0 && <p className="text-ink-400">No spot balances.</p>}
              {spot.filter((b) => num(b.total) > 0).map((b) => (
                <div key={b.coin} className="flex justify-between border-t border-ink-800 py-2 first:border-t-0"><span>{b.coin}</span><span className="tabular font-mono">{fmtSize(num(b.total), 6)} {num(b.hold) > 0 && <span className="text-ink-400">(hold {fmtSize(num(b.hold), 6)})</span>}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const AccountPanel = memo(AccountPanelBase)
