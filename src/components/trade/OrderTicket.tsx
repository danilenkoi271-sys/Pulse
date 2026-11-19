import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import { Dropdown } from '@/components/ui/Dropdown'
import { Segmented, Switch } from '@/components/ui/Controls'
import { BuilderFeeNotice } from './BuilderFeeNotice'
import { TERMS_VERSION, useSettings } from '@/stores/settings'
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

const Rcpt = ({ k, v, tone }: { k: ReactNode; v: ReactNode; tone?: string }) => (
  <div className="rcpt"><span className="l flex items-center gap-1.5">{k}</span><span className="d" /><span className={`v ${tone ?? ''}`}>{v}</span></div>
)

export function OrderTicket({ market, ctx, pickedPrice, geoBlocked }: Props) {
  const wallet = useWalletApi()
  const { positions, spot, fees, dexSummary } = useAccount()
  const { builder } = useBuilder()
  const { place } = useOrderActions()
  const oneClick = useOneClick()
  const accepted = useSettings((st) => st.acceptedTerms >= TERMS_VERSION)
  const acceptTerms = useSettings((st) => st.accept)
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

  useEffect(() => {
    setSize(''); setPrice(''); setTp(''); setSl(''); setReduceOnly(false); setShowTpsl(false)
    setIsCross(!market.onlyIsolated)
    setLeverage(Math.min(5, market.maxLeverage))
  }, [market.key, market.onlyIsolated, market.maxLeverage])

  // An open position fixes leverage + margin mode (Hyperliquid doesn't allow switching with one open).
  useEffect(() => {
    if (position) { setLeverage(position.leverage.value); setIsCross(position.leverage.type === 'cross') }
  }, [position?.leverage.value, position?.leverage.type, position])

  useEffect(() => { if (pickedPrice) { setPrice(pickedPrice.px); setKind('limit') } }, [pickedPrice])

  const ref = ctx?.mid ?? ctx?.mark ?? 0
  const entryPx = kind === 'limit' && isDecimal(price) ? Number(price) : ref

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
    geoBlocked ? 'Unavailable in your region'
    : builder.needsApproval || builder.checking ? 'Approve the interface fee first'
    : !validation.ok && size ? validation.errors[0]
    : !size ? 'Enter a size'
    : insufficient ? 'Not enough margin'
    : null

  const submit = async () => {
    setBusy(true)
    const ok = await place(input, ref, aad?.leverage ?? null)
    setBusy(false)
    if (ok) { setConfirming(false); setSize(''); setTp(''); setSl('') }
  }

  const isBuy = side === 'buy'
  const label = isSpot ? market.label : `${market.label}-PERP`
  const verb = isSpot ? (isBuy ? 'Buy' : 'Sell') : isBuy ? 'Long' : 'Short'

  return (
    <div className="flex flex-col">
      <div className="plate-h">
        <span className="idx">04</span><span className="k !text-bone">Order</span>
        {wallet.authenticated && (
          <Link to="/funds#one-click" className={`ml-auto k flex items-center gap-1.5 ${oneClick ? '!text-lime' : 'hover:text-bone'}`}>
            <span className={`h-1.5 w-1.5 ${oneClick ? 'bg-lime' : 'bg-line2'}`} />{oneClick ? 'One-click on' : 'One-click off'}
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-4 p-3">
        <div className="grid grid-cols-2 gap-px bg-line2 p-px" role="group" aria-label="Side">
          <button aria-pressed={isBuy} onClick={() => setSide('buy')} className={`h-11 font-mono text-[12px] font-semibold uppercase tracking-caps transition-colors ${isBuy ? 'bg-up text-void' : 'bg-void text-mute hover:text-bone'}`}>{isSpot ? 'Buy' : 'Long'}</button>
          <button aria-pressed={!isBuy} onClick={() => setSide('sell')} className={`h-11 font-mono text-[12px] font-semibold uppercase tracking-caps transition-colors ${!isBuy ? 'bg-down text-void' : 'bg-void text-mute hover:text-bone'}`}>{isSpot ? 'Sell' : 'Short'}</button>
        </div>

        <div className="-mx-3 -mt-1 flex border-b border-line px-1" role="tablist">
          {(['market', 'limit'] as const).map((k) => <button key={k} role="tab" aria-selected={kind === k} className="tab" onClick={() => setKind(k)}>{k}</button>)}
        </div>

        {!isSpot && (
          <div>
            <div className="mb-2 flex items-end justify-between">
              <div>
                <span className="lab !mb-0">Leverage <Help text={HELP.leverage} /></span>
                <div className="flex items-baseline gap-1">
                  <input aria-label="Leverage" inputMode="numeric" value={leverage} onChange={(e) => setLeverage(Math.round(Number(e.target.value.replace(/\D/g, '')) || 0))} className="display-wide w-14 bg-transparent text-[30px] leading-none text-bone focus:outline-none" />
                  <span className="font-mono text-[18px] font-semibold text-lime">x</span>
                </div>
              </div>
              <div>
                <span className="lab justify-end">Margin <Help text={HELP.cross} /></span>
                <Segmented label="Margin mode" value={isCross ? 'cross' : 'iso'} onChange={(v) => setIsCross(v === 'cross')} options={[{ value: 'cross', label: 'Cross', disabled: market.onlyIsolated || !!position }, { value: 'iso', label: 'Isolated', disabled: !!position }]} />
              </div>
            </div>
            <input type="range" className="rail" aria-label="Leverage slider" min={1} max={market.maxLeverage} value={Math.min(Math.max(leverage, 1), market.maxLeverage)} onChange={(e) => setLeverage(Number(e.target.value))} />
            <div className="flex justify-between"><span className="k">1×</span><span className="k">{market.maxLeverage}×</span></div>
            {leverage >= Math.max(10, market.maxLeverage * 0.6) && <p className="mt-2 border-l-2 border-warn pl-2 text-[11px] text-warn">High leverage. A small move against you can liquidate the position.</p>}
            {position && <p className="mt-2 text-[11px] text-dim">Leverage and margin mode are locked while a position is open.</p>}
          </div>
        )}

        {kind === 'limit' && (
          <div>
            <span className="lab">Limit price · USDC</span>
            <div className="flex gap-1">
              <input className="field" inputMode="decimal" placeholder={fmtPrice(ref)} value={price} onChange={(e) => setPrice(e.target.value.trim())} aria-label="Limit price" />
              <button className="btn" onClick={() => setPrice(ref ? String(ref) : '')}>Mid</button>
            </div>
          </div>
        )}

        <div>
          <div className="lab justify-between"><span>Size · {market.base}</span><span className="normal-case tracking-normal text-dim">max {displaySize(maxSize, market)}</span></div>
          <input className="field" inputMode="decimal" placeholder="0.00" value={size} onChange={(e) => setSize(e.target.value.trim())} aria-label="Order size" />
          <div className="mt-1 grid grid-cols-4 gap-px bg-line2 p-px">
            {PCTS.map((p) => <button key={p} className="bg-void py-1.5 font-mono text-[10px] tracking-caps text-mute hover:bg-raise hover:text-bone" onClick={() => setPct(p)}>{p}%</button>)}
          </div>
        </div>

        {kind === 'market' ? (
          <div>
            <span className="lab">Max slippage <Help text={HELP.slippage} /></span>
            <Segmented label="Slippage" className="w-full" value={String(slippage) as '0.5' | '1' | '3'} onChange={(v) => setSlippage(Number(v))} options={[{ value: '0.5', label: '0.5%' }, { value: '1', label: '1%' }, { value: '3', label: '3%' }]} />
          </div>
        ) : (
          <div>
            <span className="lab">Time in force <Help text={HELP.postOnly} /></span>
            <Dropdown label="Time in force" value={tif} onChange={setTif} options={[{ value: 'Gtc', label: 'Good till cancelled' }, { value: 'Alo', label: 'Post only (maker)' }, { value: 'Ioc', label: 'Immediate or cancel' }]} />
          </div>
        )}

        {!isSpot && (
          <div className="space-y-3">
            <Switch checked={reduceOnly} onChange={setReduceOnly} label={<>Reduce only <Help text={HELP.reduceOnly} /></>} />
            <Switch checked={showTpsl} onChange={setShowTpsl} label={<>Take profit / stop loss <Help text={HELP.tpsl} /></>} />
            {showTpsl && (
              <div className="grid grid-cols-2 gap-2">
                <div><span className="lab">TP price</span><input className="field" inputMode="decimal" value={tp} onChange={(e) => setTp(e.target.value.trim())} aria-label="Take profit price" /></div>
                <div><span className="lab">SL price</span><input className="field" inputMode="decimal" value={sl} onChange={(e) => setSl(e.target.value.trim())} aria-label="Stop loss price" /></div>
              </div>
            )}
          </div>
        )}

        <div className="space-y-2 border-y border-dashed border-line2 py-3">
          <Rcpt k="Order value" v={fmtUsd(notional)} />
          {!isSpot && <Rcpt k="Margin" v={fmtUsd(margin)} />}
          {!isSpot && <Rcpt k={<>Est. liquidation <Help text={HELP.liquidation} /></>} v={liq ? fmtPrice(liq) : '—'} tone={liq ? 'text-warn' : ''} />}
          <Rcpt k={`Fee (${isMaker ? 'maker' : 'taker'}, est.)`} v={fmtUsd(feeEst.protocol)} />
          {builder.configured && <Rcpt k="Pulse fee" v={`${fmtUsd((notional * builder.fee) / 100_000)} · ${builderFeeToPercent(builder.fee)}`} />}
          <Rcpt k="Available" v={fmtUsd(availableUsd)} />
        </div>

        {noDexFunds && (
          <p className="border-l-2 border-warn pl-2 text-[11px] leading-relaxed text-warn">
            Your {market.dex} balance is $0. In standard accounts each HIP-3 dex has its own balance. <Link to="/funds" className="underline">{mainOnlyHasFunds ? 'Move USDC over' : 'Fund the account'}</Link>.
          </p>
        )}

        <BuilderFeeNotice />

        {!wallet.authenticated ? (
          <button className="btn-lime h-11" onClick={wallet.login} disabled={!wallet.configured}>{wallet.configured ? 'Connect to trade' : 'Wallet login not configured'}</button>
        ) : !accepted ? (
          <div className="space-y-3 border border-line2 p-3 text-[12px] leading-relaxed text-mute">
            <p>Leveraged trading can lose more than you put in, fast. Continuing means you accept the <Link to="/terms" className="text-bone underline">Terms</Link> and <Link to="/risk" className="text-bone underline">Risk disclosure</Link>.</p>
            <button className="btn-lime w-full" onClick={acceptTerms}>I understand</button>
          </div>
        ) : (
          <button className={`${isBuy ? 'btn-up' : 'btn-down'} h-11`} disabled={!!disabledReason} onClick={() => setConfirming(true)}>{disabledReason ?? `${verb} ${market.label}`}</button>
        )}
        {wallet.authenticated && !oneClick && <p className="-mt-2 text-center text-[11px] text-dim">Your wallet will ask for a signature on every order. <Link to="/funds#one-click" className="text-mute underline">Turn on one-click</Link></p>}
      </div>

      {confirming && (
        <Modal title="Confirm order" onClose={() => !busy && setConfirming(false)}>
          <div className={`mb-4 border-l-4 px-3 py-2 ${isBuy ? 'border-up bg-up/10' : 'border-down bg-down/10'}`}>
            <p className={`display-wide text-[20px] ${isBuy ? 'text-up' : 'text-down'}`}>{verb} {size} {market.base}</p>
            <p className="k">{kind === 'market' ? 'Market' : 'Limit'} · {label}</p>
          </div>
          <div className="space-y-2">
            <Rcpt k={kind === 'market' ? `Worst price (${slippage}%)` : 'Limit price'} v={kind === 'market' ? fmtPrice(ref * (isBuy ? 1 + slippage / 100 : 1 - slippage / 100)) : fmtPrice(Number(price))} />
            <Rcpt k="Order value" v={fmtUsd(notional)} />
            {!isSpot && <Rcpt k="Leverage" v={`${leverage}× ${isCross ? 'cross' : 'isolated'}${aad && (aad.leverage.value !== leverage || aad.leverage.type !== (isCross ? 'cross' : 'isolated')) ? ' (will update)' : ''}`} />}
            {!isSpot && <Rcpt k="Margin" v={fmtUsd(margin)} />}
            {!isSpot && <Rcpt k="Est. liquidation" v={liq ? fmtPrice(liq) : 'None'} tone="text-warn" />}
            {tp && <Rcpt k="Take profit" v={fmtPrice(Number(tp))} />}
            {sl && <Rcpt k="Stop loss" v={fmtPrice(Number(sl))} />}
            {reduceOnly && <Rcpt k="Reduce only" v="yes" />}
            <Rcpt k="Est. fees" v={`${fmtUsd(feeEst.total)}${builder.active ? ` (incl. ${fmtUsd(feeEst.builder)} Pulse fee)` : ''}`} />
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-dim">Estimates. Hyperliquid computes the real liquidation price and fees at execution. {oneClick ? 'Signed instantly by your one-click agent key.' : 'Your wallet will ask you to sign.'}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn" disabled={busy} onClick={() => setConfirming(false)}>Cancel</button>
            <button className={isBuy ? 'btn-up' : 'btn-down'} disabled={busy} onClick={submit}>{busy ? 'Waiting…' : 'Confirm'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
