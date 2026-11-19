import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Market, MarketCtx } from '@/lib/hl/types'
import { useWalletApi } from '@/wallet/context'
import { useAccount } from '@/stores/account'
import { useActiveAssetData } from '@/hooks/useLiveData'
import { useOrderActions } from '@/hooks/useOrderActions'
import { useBuilder } from '@/hooks/useBuilder'
import { useOneClick } from '@/hooks/useTradeExchange'
import { Help, HELP } from '@/components/ui/Tooltip'
import { Modal } from '@/components/ui/Modal'
import { displaySize, estimateFee, estimateLiqPrice, isDecimal, validateOrder, type OrderInput, type Side } from '@/lib/hl/orders'
import { fmtPrice, fmtUsd, num } from '@/lib/format/numbers'
import { builderFeeToPercent } from '@/config/env'

interface Props {
  market: Market
  ctx: MarketCtx | undefined
  /** Price clicked in the order book — fills the limit price. */
  pickedPrice: { px: string; n: number } | null
  geoBlocked: boolean
}

const PCTS = [25, 50, 75, 100]

export function OrderTicket({ market, ctx, pickedPrice, geoBlocked }: Props) {
  const wallet = useWalletApi()
  const { positions, spot, fees, dexSummary } = useAccount()
  const { builder } = useBuilder()
  const { place } = useOrderActions()
  const oneClick = useOneClick()
  const aad = useActiveAssetData(wallet.address, market.coin)
  const position = positions.find((p) => p.coin === market.coin)
  const isSpot = market.kind === 'spot'

  const [side, setSide] = useState<Side>('buy')
  const [kind, setKind] = useState<'market' | 'limit'>('market')
  const [size, setSize] = useState('')
  const [price, setPrice] = useState('')
  const [tif, setTif] = useState<'Gtc' | 'Alo' | 'Ioc'>('Gtc')
  const [reduceOnly, setReduceOnly] = useState(false)
  const [leverage, setLeverage] = useState(5)
  const [isCross, setIsCross] = useState(!market.onlyIsolated)
  const [showTpsl, setShowTpsl] = useState(false)
  const [tp, setTp] = useState('')
  const [sl, setSl] = useState('')
  const [slippage, setSlippage] = useState(1)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [touchedLev, setTouchedLev] = useState(false)

  // Reset the form when switching market.
  useEffect(() => {
    setSize(''); setPrice(''); setTp(''); setSl(''); setReduceOnly(false); setShowTpsl(false); setTouchedLev(false)
    setIsCross(!market.onlyIsolated)
    setLeverage(Math.min(5, market.maxLeverage))
  }, [market.key, market.onlyIsolated, market.maxLeverage])

  // Existing position fixes leverage + margin mode (Hyperliquid doesn't allow switching with an open position).
  useEffect(() => {
    if (position) { setLeverage(position.leverage.value); setIsCross(position.leverage.type === 'cross') }
  }, [position?.leverage.value, position?.leverage.type, position])

  useEffect(() => {
    if (pickedPrice) { setPrice(pickedPrice.px); setKind('limit') }
  }, [pickedPrice])

  const ref = ctx?.mid ?? ctx?.mark ?? 0
  const entryPx = kind === 'limit' && isDecimal(price) ? Number(price) : ref

  // ---- balances / max size ---------------------------------------------------------------
  const spotBal = (coin: string) => {
    const b = spot.find((x) => x.coin === coin)
    return b ? Math.max(0, num(b.total) - num(b.hold)) : 0
  }
  const availableUsd = isSpot
    ? side === 'buy' ? spotBal(market.quote) : spotBal(market.base) * ref
    : num(aad?.availableToTrade?.[side === 'buy' ? 0 : 1])
  const eff = isSpot ? 1 : leverage
  const maxSize = useMemo(() => {
    if (reduceOnly && position) return Math.abs(position.size)
    if (!(entryPx > 0)) return 0
    return Math.max(0, (availableUsd * eff * 0.98) / entryPx) // 2% headroom for fees / price moves
  }, [availableUsd, eff, entryPx, reduceOnly, position])

  const setPct = (p: number) => {
    const raw = (maxSize * p) / 100
    const f = 10 ** market.szDecimals
    setSize(raw > 0 ? String(Math.floor(raw * f) / f) : '')
  }

  // ---- derived estimates -----------------------------------------------------------------
  const input: OrderInput = { market, side, kind, size, price, tif, reduceOnly, leverage, isCross, tp, sl, slippagePct: slippage }
  const validation = validateOrder(input, ref)
  const sizeNum = isDecimal(size) ? Number(size) : 0
  const notional = sizeNum * entryPx
  const margin = isSpot ? notional : notional / Math.max(1, leverage)
  const isMaker = kind === 'limit' && tif === 'Alo'
  const feeEst = estimateFee(notional, fees, market.feeMult, isMaker, builder.active ? builder.fee : 0)
  const liq = isSpot ? null : estimateLiqPrice({ side, entry: entryPx, size: sizeNum, leverage, maxLeverage: market.maxLeverage, isCross, freeCollateral: Math.max(0, availableUsd - margin) })
  const insufficient = !isSpot && !reduceOnly && sizeNum > 0 && margin > availableUsd + 0.01
  const noDexFunds = market.kind === 'hip3' && wallet.authenticated && aad !== null && num(aad.availableToTrade?.[0]) === 0 && !position
  const mainOnlyHasFunds = (dexSummary['']?.accountValue ?? 0) > 0

  const disabledReason =
    geoBlocked ? 'Trading is unavailable in your region'
    : !validation.ok && size ? validation.errors[0]
    : !size ? 'Enter a size'
    : insufficient ? 'Insufficient margin'
    : null

  const submit = async () => {
    setBusy(true)
    const ok = await place(input, ref, aad?.leverage ?? null)
    setBusy(false)
    if (ok) { setConfirming(false); setSize(''); setTp(''); setSl('') }
  }

  const isBuy = side === 'buy'
  const label = isSpot ? market.label : `${market.label}-PERP`

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-ink-850 p-1">
        <button className={`rounded-md py-2 text-sm font-semibold transition ${isBuy ? 'bg-up text-ink-950' : 'text-ink-300 hover:text-white'}`} onClick={() => setSide('buy')}>{isSpot ? 'Buy' : 'Long'}</button>
        <button className={`rounded-md py-2 text-sm font-semibold transition ${!isBuy ? 'bg-down text-ink-950' : 'text-ink-300 hover:text-white'}`} onClick={() => setSide('sell')}>{isSpot ? 'Sell' : 'Short'}</button>
      </div>

      <div className="flex gap-1">
        {(['market', 'limit'] as const).map((k) => (
          <button key={k} className={`chip capitalize ${kind === k ? 'chip-active' : ''}`} onClick={() => setKind(k)}>{k}</button>
        ))}
      </div>

      {!isSpot && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className="label">Margin mode <Help text={HELP.cross} /></span>
            <div className="grid grid-cols-2 gap-1 rounded-lg bg-ink-850 p-1 text-xs font-medium">
              <button disabled={market.onlyIsolated || !!position} className={`rounded py-1.5 disabled:opacity-50 ${isCross ? 'bg-ink-700 text-white' : 'text-ink-300'}`} onClick={() => setIsCross(true)}>Cross</button>
              <button disabled={!!position} className={`rounded py-1.5 disabled:opacity-50 ${!isCross ? 'bg-ink-700 text-white' : 'text-ink-300'}`} onClick={() => setIsCross(false)}>Isolated</button>
            </div>
          </div>
          <div>
            <span className="label">Leverage <Help text={HELP.leverage} /></span>
            <div className="flex items-center gap-1 rounded-lg bg-ink-850 px-2 py-1.5">
              <input aria-label="Leverage" inputMode="numeric" className="w-full bg-transparent text-right font-mono text-sm outline-none" value={leverage} onChange={(e) => { setTouchedLev(true); setLeverage(Math.round(Number(e.target.value.replace(/\D/g, '')) || 0)) }} />
              <span className="text-xs text-ink-400">x</span>
            </div>
          </div>
          <input aria-label="Leverage slider" type="range" min={1} max={market.maxLeverage} value={Math.min(Math.max(leverage, 1), market.maxLeverage)} disabled={!!position && false} onChange={(e) => { setTouchedLev(true); setLeverage(Number(e.target.value)) }} className="col-span-2 accent-pulse-500" />
          {leverage >= Math.max(10, market.maxLeverage * 0.6) && <p className="col-span-2 text-[11px] text-warn">High leverage: small price moves can liquidate you.</p>}
          {position && !touchedLev && <p className="col-span-2 text-[11px] text-ink-400">Leverage and margin mode are fixed while a position is open.</p>}
        </div>
      )}

      {kind === 'limit' && (
        <div>
          <span className="label">Price (USDC)</span>
          <div className="flex gap-1">
            <input className="input font-mono" inputMode="decimal" placeholder={fmtPrice(ref)} value={price} onChange={(e) => setPrice(e.target.value.trim())} aria-label="Limit price" />
            <button className="btn-ghost px-3 text-xs" onClick={() => setPrice(ref ? String(ref) : '')}>Mid</button>
          </div>
        </div>
      )}

      <div>
        <div className="label justify-between">
          <span>Size ({market.base})</span>
          <span className="font-normal text-ink-400">Max {displaySize(maxSize, market)}</span>
        </div>
        <input className="input font-mono" inputMode="decimal" placeholder="0.00" value={size} onChange={(e) => setSize(e.target.value.trim())} aria-label="Order size" />
        <div className="mt-1 grid grid-cols-4 gap-1">
          {PCTS.map((p) => <button key={p} className="chip border border-ink-700 text-center" onClick={() => setPct(p)}>{p}%</button>)}
        </div>
      </div>

      {kind === 'market' && (
        <div>
          <span className="label">Max slippage <Help text={HELP.slippage} /></span>
          <div className="flex items-center gap-1">
            {[0.5, 1, 3].map((s) => <button key={s} className={`chip border border-ink-700 ${slippage === s ? 'chip-active' : ''}`} onClick={() => setSlippage(s)}>{s}%</button>)}
          </div>
        </div>
      )}

      {kind === 'limit' && (
        <div>
          <span className="label">Time in force <Help text={HELP.postOnly} /></span>
          <select className="input" value={tif} onChange={(e) => setTif(e.target.value as typeof tif)} aria-label="Time in force">
            <option value="Gtc">Good till cancelled</option><option value="Alo">Post only (maker)</option><option value="Ioc">Immediate or cancel</option>
          </select>
        </div>
      )}

      {!isSpot && (
        <>
          <label className="flex items-center gap-2 text-xs text-ink-200">
            <input type="checkbox" checked={reduceOnly} onChange={(e) => setReduceOnly(e.target.checked)} className="accent-pulse-500" /> Reduce only <Help text={HELP.reduceOnly} />
          </label>
          <div className="flex items-center gap-1 text-xs">
            <button className="text-left text-pulse-300 hover:underline" onClick={() => setShowTpsl((s) => !s)}>{showTpsl ? '− Hide' : '+ Add'} take-profit / stop-loss</button>
            <Help text={HELP.tpsl} />
          </div>
          {showTpsl && (
            <div className="grid grid-cols-2 gap-2">
              <div><span className="label">TP price</span><input className="input font-mono" inputMode="decimal" value={tp} onChange={(e) => setTp(e.target.value.trim())} aria-label="Take profit price" /></div>
              <div><span className="label">SL price</span><input className="input font-mono" inputMode="decimal" value={sl} onChange={(e) => setSl(e.target.value.trim())} aria-label="Stop loss price" /></div>
            </div>
          )}
        </>
      )}

      <dl className="space-y-1.5 rounded-lg bg-ink-850 p-3 text-xs">
        <Row k="Order value" v={fmtUsd(notional)} />
        {!isSpot && <Row k="Margin required" v={fmtUsd(margin)} />}
        {!isSpot && <Row k={<>Est. liquidation <Help text={HELP.liquidation} /></>} v={liq ? fmtPrice(liq) : '—'} />}
        <Row k={`Est. fee (${isMaker ? 'maker' : 'taker'})`} v={fmtUsd(feeEst.protocol)} />
        {builder.active && <Row k="Interface fee" v={`${fmtUsd(feeEst.builder)} (${builderFeeToPercent(builder.fee)})`} />}
        <Row k="Available" v={fmtUsd(availableUsd)} />
      </dl>

      {noDexFunds && (
        <p className="rounded-lg border border-warn/40 bg-warn/10 p-2 text-[11px] text-warn">
          Your {market.dex} balance is $0 — HIP-3 dexes use a separate balance in standard accounts.{' '}
          <Link to="/funds" className="underline">{mainOnlyHasFunds ? 'Transfer USDC' : 'Fund your account'}</Link>.
        </p>
      )}

      {!wallet.authenticated ? (
        <button className="btn-primary" onClick={wallet.login} disabled={!wallet.configured}>{wallet.configured ? 'Connect to trade' : 'Wallet login not configured'}</button>
      ) : (
        <button className={isBuy ? 'btn-up' : 'btn-down'} disabled={!!disabledReason} onClick={() => setConfirming(true)}>
          {disabledReason ?? `${isSpot ? (isBuy ? 'Buy' : 'Sell') : isBuy ? 'Long' : 'Short'} ${market.label}`}
        </button>
      )}

      {wallet.authenticated && (
        <p className="text-center text-[11px] text-ink-400">
          {oneClick ? <>⚡ One-click trading is on</> : <>Wallet popup on every order · <Link to="/funds#one-click" className="text-pulse-300 underline">enable one-click</Link></>}
        </p>
      )}

      {confirming && (
        <Modal title="Confirm order" onClose={() => !busy && setConfirming(false)}>
          <div className="space-y-3 text-sm">
            <div className={`rounded-lg p-3 text-center text-base font-bold ${isBuy ? 'bg-up/15 text-up' : 'bg-down/15 text-down'}`}>
              {isSpot ? (isBuy ? 'Buy' : 'Sell') : isBuy ? 'Long' : 'Short'} {size} {market.base} · {kind === 'market' ? 'Market' : 'Limit'}
            </div>
            <dl className="space-y-2">
              <Row k="Market" v={label} />
              <Row k={kind === 'market' ? `Worst price (${slippage}% slippage)` : 'Limit price'} v={kind === 'market' ? fmtPrice(ref * (isBuy ? 1 + slippage / 100 : 1 - slippage / 100)) : fmtPrice(Number(price))} />
              <Row k="Size" v={`${size} ${market.base}`} />
              <Row k="Order value" v={fmtUsd(notional)} />
              {!isSpot && <Row k="Leverage" v={`${leverage}x ${isCross ? 'cross' : 'isolated'}${aad && (aad.leverage.value !== leverage || aad.leverage.type !== (isCross ? 'cross' : 'isolated')) ? ' (will be updated)' : ''}`} />}
              {!isSpot && <Row k="Margin required" v={fmtUsd(margin)} />}
              {!isSpot && <Row k="Est. liquidation price" v={liq ? fmtPrice(liq) : 'None'} />}
              {tp && <Row k="Take profit" v={fmtPrice(Number(tp))} />}
              {sl && <Row k="Stop loss" v={fmtPrice(Number(sl))} />}
              {reduceOnly && <Row k="Reduce only" v="Yes" />}
              <Row k="Est. fees" v={`${fmtUsd(feeEst.total)}${builder.active ? ` (incl. ${fmtUsd(feeEst.builder)} interface fee)` : ''}`} />
            </dl>
            <p className="text-[11px] text-ink-400">Estimates only — liquidation price and fees are calculated by Hyperliquid at execution. {oneClick ? 'Signed instantly by your one-click agent wallet.' : 'Your wallet will ask you to sign.'}</p>
            <div className="grid grid-cols-2 gap-2">
              <button className="btn-ghost" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
              <button className={isBuy ? 'btn-up' : 'btn-down'} disabled={busy} onClick={submit}>{busy ? 'Waiting…' : 'Confirm'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function Row({ k, v }: { k: React.ReactNode; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-1 text-ink-400">{k}</dt>
      <dd className="tabular font-mono text-ink-100">{v}</dd>
    </div>
  )
}
