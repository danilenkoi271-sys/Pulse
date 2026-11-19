import { useCallback, useEffect, useRef, useState } from 'react'
import { createPublicClient, formatUnits, http, type PublicClient } from 'viem'
import { arbitrum, arbitrumSepolia } from 'viem/chains'
import { ARBITRUM, BRIDGE, IS_TESTNET, MIN_DEPOSIT_USDC } from '@/config/env'
import { useWalletApi } from '@/wallet/context'
import { subs } from '@/lib/hl/clients'
import { ERC20_ABI, USDC_DECIMALS, parseUsdc, validateDeposit } from '@/lib/funds'
import { bridgePreflight, type Preflight } from '@/lib/bridge'
import { errMsg } from '@/lib/hl/trade'
import { toast } from '@/stores/toasts'
import { Modal } from '@/components/ui/Modal'
import { shortAddr } from '@/lib/format/numbers'

const pub = createPublicClient({ chain: IS_TESTNET ? arbitrumSepolia : arbitrum, transport: http() }) as PublicClient

type Step = 'idle' | 'signing' | 'confirming' | 'crediting' | 'done'
const order: Step[] = ['idle', 'signing', 'confirming', 'crediting', 'done']

export function DepositCard() {
  const w = useWalletApi()
  const [amount, setAmount] = useState('')
  const [usdc, setUsdc] = useState<bigint | null>(null)
  const [eth, setEth] = useState<bigint | null>(null)
  const [check, setCheck] = useState<Preflight | null>(null)
  const [confirm, setConfirm] = useState(false)
  const [step, setStep] = useState<Step>('idle')
  const [tx, setTx] = useState<`0x${string}` | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const startedAt = useRef(0)

  const refresh = useCallback(async () => {
    if (!w.address) return
    try {
      const [b, e] = await Promise.all([
        pub.readContract({ address: BRIDGE.usdc, abi: ERC20_ABI, functionName: 'balanceOf', args: [w.address] }),
        pub.getBalance({ address: w.address }),
      ])
      setUsdc(b); setEth(e)
    } catch { /* keep last values */ }
  }, [w.address])
  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => { void bridgePreflight(pub).then(setCheck) }, [])

  // Wait for Hyperliquid to credit the deposit (ledger update over the shared WebSocket).
  useEffect(() => {
    if (step !== 'crediting' || !w.address) return
    let off: (() => Promise<void>) | null = null
    let cancelled = false
    subs().userNonFundingLedgerUpdates({ user: w.address }, (ev) => {
      if (ev.nonFundingLedgerUpdates.some((u) => u.delta.type === 'deposit' && u.time >= startedAt.current - 60_000)) {
        setStep('done'); toast.success('Deposit credited on Hyperliquid'); void refresh()
      }
    }).then((s) => (cancelled ? void s.unsubscribe().catch(() => undefined) : (off = () => s.unsubscribe()))).catch(() => undefined)
    return () => { cancelled = true; void off?.().catch(() => undefined) }
  }, [step, w.address, refresh])

  const error = amount ? validateDeposit(amount, usdc) : null
  const noGas = eth !== null && eth === 0n
  const blocked = check !== null && !check.ok

  const send = async () => {
    const v = parseUsdc(amount)
    if (v === null || validateDeposit(amount, usdc)) return
    setErr(null); setStep('signing'); startedAt.current = Date.now()
    try {
      const fresh = await bridgePreflight(pub) // re-verify immediately before moving money
      setCheck(fresh)
      if (!fresh.ok) throw new Error(fresh.reason)
      const wc = await w.getMainWalletClient() // also switches the wallet to Arbitrum
      const hash = await wc.writeContract({ address: BRIDGE.usdc, abi: ERC20_ABI, functionName: 'transfer', args: [BRIDGE.address, v], account: wc.account!, chain: wc.chain })
      setTx(hash); setConfirm(false); setStep('confirming')
      await pub.waitForTransactionReceipt({ hash })
      setStep('crediting'); void refresh()
    } catch (e) {
      setStep('idle'); setErr(errMsg(e))
    }
  }

  const reset = () => { setStep('idle'); setTx(null); setAmount(''); setErr(null) }
  const stages: [Step, string][] = [['signing', 'Approve in your wallet'], ['confirming', `Mined on ${ARBITRUM.name}`], ['crediting', 'Credited on Hyperliquid']]

  return (
    <section className="ticks p-5" aria-labelledby="dep-h">
      <p className="k !text-lime">01</p>
      <h2 id="dep-h" className="display mt-1 text-[34px] text-bone">Deposit</h2>
      <p className="mt-2 text-[13px] text-mute">USDC from your wallet on {ARBITRUM.name}, sent directly to Hyperliquid’s bridge contract. Pulse never holds it.</p>

      <div className="mt-5 space-y-2">
        <div className="rcpt"><span className="l">USDC in wallet</span><span className="d" /><span className="v">{usdc === null ? '…' : formatUnits(usdc, USDC_DECIMALS)}</span></div>
        <div className="rcpt"><span className="l">{IS_TESTNET ? 'Sepolia ETH' : 'ETH'} for gas</span><span className="d" /><span className={`v ${noGas ? '!text-down' : ''}`}>{eth === null ? '…' : Number(formatUnits(eth, 18)).toFixed(5)}</span></div>
        <div className="rcpt"><span className="l">Bridge check</span><span className="d" /><span className={`v ${check === null ? 'text-dim' : check.ok ? '!text-up' : '!text-down'}`}>{check === null ? 'checking…' : check.ok ? '✓ verified on-chain' : '✕ blocked'}</span></div>
      </div>
      {check && !check.ok && <p className="mt-3 border-l-2 border-down pl-2 text-[12px] text-down">{check.reason}</p>}
      {noGas && <p className="mt-3 border-l-2 border-warn pl-2 text-[12px] text-warn">You need a little ETH on {ARBITRUM.name} to pay the network fee.</p>}

      {step === 'idle' ? (
        <>
          <label className="lab mt-5" htmlFor="dep-amt">Amount · USDC · min {MIN_DEPOSIT_USDC}</label>
          <div className="flex gap-1">
            <input id="dep-amt" className="field" inputMode="decimal" placeholder={`${MIN_DEPOSIT_USDC}.00`} value={amount} onChange={(e) => setAmount(e.target.value.trim())} />
            <button className="btn" onClick={() => usdc !== null && setAmount(formatUnits(usdc, USDC_DECIMALS))}>Max</button>
          </div>
          {error && <p className="mt-1.5 text-[12px] text-down">{error}</p>}
          {err && <p className="mt-1.5 text-[12px] text-down">{err}</p>}
          <p className="mt-3 border-l-2 border-warn pl-2 text-[12px] leading-relaxed text-warn">Under {MIN_DEPOSIT_USDC} USDC is <b>not credited and is lost for good</b>. Only send native USDC on {ARBITRUM.name}. First time here? Send a small amount first, wait for it to land, then send the rest.</p>
          <button className="btn-lime mt-4 h-11 w-full" disabled={!amount || !!error || !w.authenticated || blocked} onClick={() => setConfirm(true)}>{w.authenticated ? 'Review deposit' : 'Connect a wallet first'}</button>
        </>
      ) : (
        <ol className="mt-5 space-y-0">
          {stages.map(([s, label], i) => {
            const done = order.indexOf(step) > order.indexOf(s)
            const active = step === s
            return (
              <li key={s} className="flex gap-3">
                <div className="flex flex-col items-center"><span className={`h-3 w-3 border ${done ? 'border-up bg-up' : active ? 'animate-blink border-lime bg-lime' : 'border-line2'}`} />{i < 2 && <span className={`w-px flex-1 ${done ? 'bg-up' : 'bg-line2'}`} />}</div>
                <p className={`pb-4 font-mono text-[12px] ${done ? 'text-up' : active ? 'text-bone' : 'text-dim'}`}>{label}</p>
              </li>
            )
          })}
          {tx && <li className="pl-6 text-[12px]"><a className="text-lime underline" href={`${ARBITRUM.explorer}/tx/${tx}`} target="_blank" rel="noopener noreferrer">{shortAddr(tx)} on explorer ↗</a></li>}
          {step === 'crediting' && <li className="pl-6 pt-2 text-[12px] text-dim">Your USDC is already in the bridge. Crediting normally takes under a minute.</li>}
          {step === 'done' && <li className="pl-6 pt-3"><button className="btn" onClick={reset}>Another deposit</button></li>}
        </ol>
      )}

      {confirm && (
        <Modal title="Confirm deposit" onClose={() => step === 'idle' && setConfirm(false)}>
          <div className="space-y-2.5">
            <div className="rcpt"><span className="l">Amount</span><span className="d" /><span className="v">{amount} USDC</span></div>
            <div className="rcpt"><span className="l">Network</span><span className="d" /><span className="v">{ARBITRUM.name}</span></div>
            <div className="rcpt"><span className="l">Credited to</span><span className="d" /><span className="v">{shortAddr(w.address)} (you)</span></div>
            <div className="rcpt"><span className="l">Arrives</span><span className="d" /><span className="v">&lt; 1 min</span></div>
          </div>
          <p className="k mt-4">To (Hyperliquid bridge)</p>
          <p className="mt-1 break-all border border-line2 bg-void p-2 font-mono text-[11px] text-bone">{BRIDGE.address}</p>
          <p className="mt-3 text-[12px] leading-relaxed text-dim">A plain USDC transfer to the official bridge. Check that this exact address is what your wallet shows before you approve.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button className="btn" disabled={step !== 'idle'} onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn-lime" disabled={step !== 'idle'} onClick={send}>{step === 'signing' ? 'Check wallet…' : 'Deposit'}</button>
          </div>
        </Modal>
      )}
    </section>
  )
}
