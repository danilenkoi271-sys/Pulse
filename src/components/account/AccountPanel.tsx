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

const pnlCls = (v: number) => (v > 0 ? 'text-up' : v < 0 ? 'text-down' : 'text-text')
const time = (t: number) => new Date(t).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
const labelOf = (coin: string) => useMarkets.getState().byKey[coin]?.label ?? coin

const Empty = ({ children }: { children: React.ReactNode }) => <div className="p-8 text-center font-mono text-[12px] text-dim">{children}</div>
const Side = ({ buy, children }: { buy: boolean; children: React.ReactNode }) => (
  <span className={`inline-block border px-1.5 py-px font-mono text-[10px] font-semibold uppercase tracking-caps ${buy ? 'border-up/60 text-up' : 'border-down/60 text-down'}`}>{children}</span>
)

const PositionRow = memo(function PositionRow({ p, onClose, busy }: { p: Position; onClose: (p: Position) => void; busy: boolean }) {
  const m = useMarkets((s) => s.byKey[p.coin])
  const mark = useMarkets((s) => s.ctx[p.coin]?.mark ?? 0)
  const long = p.size > 0
  const liqDist = p.liquidationPx && mark ? Math.abs(mark - p.liquidationPx) / mark : null
  return (
    <tr className="rowline hover:bg-raise">
      <td className="whitespace-nowrap px-3 py-2.5">
        <Link to={`/trade/${encodeURIComponent(p.coin)}`} className="mr-2 font-mono text-[13px] font-semibold text-bone hover:text-lime">{m?.label ?? p.coin}</Link>
        <Side buy={long}>{long ? 'Long' : 'Short'} {p.leverage.value}× {p.leverage.type === 'cross' ? 'X' : 'ISO'}</Side>
      </td>
      <td className="num px-3 py-2.5 text-right text-[12px]">{fmtSize(Math.abs(p.size), m?.szDecimals ?? 4)}</td>
      <td className="num px-3 py-2.5 text-right text-[12px] xl:hidden 2xl:table-cell">{fmtUsd(p.positionValue)}</td>
      <td className="num px-3 py-2.5 text-right text-[12px]">{fmtPrice(p.entryPx)}</td>
      <td className="num px-3 py-2.5 text-right text-[12px]">{fmtPrice(mark)}</td>
      <td className={`num px-3 py-2.5 text-right text-[12px] ${liqDist !== null && liqDist < 0.1 ? 'font-semibold text-warn' : ''}`}>{p.liquidationPx ? fmtPrice(p.liquidationPx) : '—'}</td>
      <td className="num px-3 py-2.5 text-right text-[12px]">{fmtUsd(p.marginUsed)}</td>
      <td className={`num px-3 py-2.5 text-right text-[12px] ${pnlCls(p.unrealizedPnl)}`}>{fmtUsd(p.unrealizedPnl, { sign: true })} <span className="text-[10px] opacity-80">{fmtPct(p.roe * 100, 1)}</span></td>
      <td className="px-3 py-2.5 text-right"><button className="btn btn-sm" disabled={busy} onClick={() => onClose(p)}>Close</button></td>
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
  const tabs: [Tab, string, number][] = [['positions', 'Positions', positions.length], ['orders', 'Open orders', openCount], ['history', 'History', 0], ['fills', 'Fills', 0], ['balances', 'Balances', 0]]

  return (
    <div className="flex h-full flex-col">
      <div className="plate-h !h-auto flex-wrap !gap-0 !px-0">
        <span className="idx border-r border-line px-3 py-2.5">05</span>
        <div className="flex overflow-x-auto" role="tablist">
          {tabs.map(([k, l, n]) => <button key={k} role="tab" aria-selected={tab === k} className="tab" onClick={() => setTab(k)}>{l}{n > 0 && <span className="ml-1.5 text-lime">{n}</span>}</button>)}
        </div>
        {hasAccount && (
          <span className="ml-auto hidden whitespace-nowrap px-3 sm:block">
            <span className="k">Unrealized </span><b className={`num text-[12px] ${pnlCls(totalPnl)}`}>{fmtUsd(totalPnl, { sign: true })}</b>
            <span className="k ml-4">Realized </span><b className={`num text-[12px] ${pnlCls(realized)}`}>{fmtUsd(realized, { sign: true })}</b>
          </span>
        )}
      </div>

      <div className="min-h-[170px] flex-1 overflow-auto">
        {!hasAccount ? (
          <Empty>Connect a wallet to see positions, orders and history.</Empty>
        ) : tab === 'positions' ? (
          !loaded ? <Empty>Loading…</Empty> : positions.length === 0 ? <Empty>No open positions.</Empty> : (
            <table className="w-full min-w-[760px]">
              <thead><tr><th className="th">Market</th><th className="th text-right">Size</th><th className="th text-right xl:hidden 2xl:table-cell">Value</th><th className="th text-right">Entry</th><th className="th text-right">Mark</th>
                <th className="th text-right"><span className="inline-flex items-center gap-1.5">Liq. price <Help text={HELP.liquidation} /></span></th><th className="th text-right">Margin</th><th className="th text-right">PnL · ROE</th><th className="th" /></tr></thead>
              <tbody>{positions.map((p) => <PositionRow key={`${p.dex}:${p.coin}`} p={p} onClose={close} busy={busy === p.coin} />)}</tbody>
            </table>
          )
        ) : tab === 'orders' ? (
          openOrders.length === 0 && pending.length === 0 ? <Empty>No open orders.</Empty> : (
            <>
              {openOrders.length > 1 && <div className="flex justify-end px-3 pt-2"><button className="btn btn-sm" onClick={() => void cancelAll(openOrders)}>Cancel all</button></div>}
              <table className="w-full min-w-[680px]">
                <thead><tr><th className="th">Time</th><th className="th">Market</th><th className="th">Type</th><th className="th text-right">Size</th><th className="th text-right">Price</th><th className="th">Status</th><th className="th" /></tr></thead>
                <tbody>
                  {pending.map((p) => (
                    <tr key={p.id} className="rowline bg-raise/50">
                      <td className="num px-3 py-2.5 text-[12px] text-mute">{time(p.ts)}</td>
                      <td className="px-3 py-2.5 font-mono text-[13px] font-semibold text-bone">{p.label}</td>
                      <td className="px-3 py-2.5"><Side buy={p.side === 'buy'}>{p.side} {p.kind}</Side></td>
                      <td className="num px-3 py-2.5 text-right text-[12px]">{p.size}</td>
                      <td className="num px-3 py-2.5 text-right text-[12px]">{p.kind === 'market' ? 'Market' : p.price}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px]">
                        {p.status === 'pending' && <span className="animate-blink text-warn">● Pending</span>}
                        {p.status === 'confirmed' && <span className="text-up">✓ Confirmed</span>}
                        {p.status === 'rejected' && <span className="text-down" title={p.detail}>✕ {p.detail}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right">{p.status === 'rejected' && <button className="k hover:text-bone" onClick={() => usePending.getState().dismiss(p.id)}>Dismiss</button>}</td>
                    </tr>
                  ))}
                  {openOrders.map((o) => (
                    <tr key={o.oid} className="rowline hover:bg-raise">
                      <td className="num px-3 py-2.5 text-[12px] text-mute">{time(o.timestamp)}</td>
                      <td className="px-3 py-2.5 font-mono text-[13px] font-semibold text-bone">{labelOf(o.coin)}</td>
                      <td className="px-3 py-2.5"><Side buy={o.side === 'B'}>{o.side === 'B' ? 'Buy' : 'Sell'} {o.orderType}{o.reduceOnly ? ' · RO' : ''}</Side></td>
                      <td className="num px-3 py-2.5 text-right text-[12px]">{o.sz}</td>
                      <td className="num px-3 py-2.5 text-right text-[12px]">{o.isTrigger ? o.triggerCondition : fmtPrice(num(o.limitPx))}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-mute">Open</td>
                      <td className="px-3 py-2.5 text-right"><button className="btn btn-sm" onClick={() => void cancel(o)}>Cancel</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )
        ) : tab === 'history' ? (
          history.length === 0 ? <Empty>No order history yet.</Empty> : (
            <table className="w-full min-w-[640px]">
              <thead><tr><th className="th">Time</th><th className="th">Market</th><th className="th">Type</th><th className="th text-right">Size</th><th className="th text-right">Price</th><th className="th">Status</th></tr></thead>
              <tbody>{history.slice(0, 100).map((h) => (
                <tr key={`${h.order.oid}-${h.statusTimestamp}`} className="rowline hover:bg-raise">
                  <td className="num px-3 py-2.5 text-[12px] text-mute">{time(h.statusTimestamp)}</td>
                  <td className="px-3 py-2.5 font-mono text-[13px] font-semibold text-bone">{labelOf(h.order.coin)}</td>
                  <td className="px-3 py-2.5"><Side buy={h.order.side === 'B'}>{h.order.side === 'B' ? 'Buy' : 'Sell'} {h.order.orderType}</Side></td>
                  <td className="num px-3 py-2.5 text-right text-[12px]">{h.order.origSz}</td>
                  <td className="num px-3 py-2.5 text-right text-[12px]">{fmtPrice(num(h.order.limitPx))}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] capitalize text-mute">{String(h.status).replace(/([A-Z])/g, ' $1').toLowerCase()}</td>
                </tr>))}</tbody>
            </table>
          )
        ) : tab === 'fills' ? (
          fills.length === 0 ? <Empty>No fills yet.</Empty> : (
            <table className="w-full min-w-[720px]">
              <thead><tr><th className="th">Time</th><th className="th">Market</th><th className="th">Direction</th><th className="th text-right">Price</th><th className="th text-right">Size</th><th className="th text-right">Fee</th><th className="th text-right">Closed PnL</th></tr></thead>
              <tbody>{fills.slice(0, 100).map((f) => (
                <tr key={`${f.hash}:${f.tid}`} className="rowline hover:bg-raise">
                  <td className="num px-3 py-2.5 text-[12px] text-mute">{time(f.time)}</td>
                  <td className="px-3 py-2.5 font-mono text-[13px] font-semibold text-bone">{labelOf(f.coin)}</td>
                  <td className={`px-3 py-2.5 font-mono text-[11px] ${f.side === 'B' ? 'text-up' : 'text-down'}`}>{f.dir}</td>
                  <td className="num px-3 py-2.5 text-right text-[12px]">{fmtPrice(num(f.px))}</td>
                  <td className="num px-3 py-2.5 text-right text-[12px]">{f.sz}</td>
                  <td className="num px-3 py-2.5 text-right text-[12px] text-mute">{fmtUsd(num(f.fee))}</td>
                  <td className={`num px-3 py-2.5 text-right text-[12px] ${pnlCls(num(f.closedPnl))}`}>{num(f.closedPnl) ? fmtUsd(num(f.closedPnl), { sign: true }) : '—'}</td>
                </tr>))}</tbody>
            </table>
          )
        ) : (
          <div className="grid gap-6 p-4 md:grid-cols-2">
            <div>
              <p className="k mb-2">Perps {mode && <span className="text-line2">· {mode === 'default' || mode === 'disabled' ? 'standard' : mode === 'unifiedAccount' ? 'unified' : 'portfolio margin'} mode</span>}</p>
              {Object.entries(dexSummary).map(([dex, s]) => (
                <div key={dex} className="rcpt rowline py-2"><span className="l">{dex || 'Main · USDC'}</span><span className="d" /><span className="v">{fmtUsd(s.accountValue)} <span className="text-dim">· free {fmtUsd(s.withdrawable)}</span></span></div>
              ))}
            </div>
            <div>
              <p className="k mb-2">Spot</p>
              {spot.filter((b) => num(b.total) > 0).length === 0 && <p className="font-mono text-[12px] text-dim">No spot balances.</p>}
              {spot.filter((b) => num(b.total) > 0).map((b) => (
                <div key={b.coin} className="rcpt rowline py-2"><span className="l">{b.coin}</span><span className="d" /><span className="v">{fmtSize(num(b.total), 6)}{num(b.hold) > 0 && <span className="text-dim"> · hold {fmtSize(num(b.hold), 6)}</span>}</span></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const AccountPanel = memo(AccountPanelBase)
