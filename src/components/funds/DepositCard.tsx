import { useCallback, useEffect, useRef, useState } from 'react'
import { createPublicClient, formatUnits, http } from 'viem'
import { arbitrum, arbitrumSepolia } from 'viem/chains'
import { ARBITRUM, BRIDGE, IS_TESTNET, MIN_DEPOSIT_USDC } from '@/config/env'
import { useWalletApi } from '@/wallet/context'
import { subs } from '@/lib/hl/clients'
import { ERC20_ABI, USDC_DECIMALS, parseUsdc, validateDeposit } from '@/lib/funds'
import { errMsg } from '@/lib/hl/trade'
import { toast } from '@/stores/toasts'
import { Modal } from '@/components/ui/Modal'
import { shortAddr } from '@/lib/format/numbers'

const pub = createPublicClient({ chain: IS_TESTNET ? arbitrumSepolia : arbitrum, transport: http() })

type Step = 'idle' | 'signing' | 'confirming' | 'crediting' | 'done'

export function DepositCard() {
  const w = useWalletApi()
  const [amount, setAmount] = useState('')
  const [usdc, setUsdc] = useState<bigint | null>(null)
  const [eth, setEth] = useState<bigint | null>(null)
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
    } catch { /* RPC hiccup: keep last values */ }
  }, [w.address])
  useEffect(() => { void refresh() }, [refresh])

  // Step 3: wait for Hyperliquid to credit the deposit (ledger update over the shared WebSocket).
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

  const send = async () => {
    const v = parseUsdc(amount)
    if (v === null || validateDeposit(amount, usdc)) return
    setErr(null); setStep('signing'); startedAt.current = Date.now()
    try {
      const wc = await w.getMainWalletClient() // also switches the wallet to Arbitrum
      const hash = await wc.writeContract({
        address: BRIDGE.usdc, abi: ERC20_ABI, functionName: 'transfer', args: [BRIDGE.address, v],
        account: wc.account!, chain: wc.chain,
      })
      setTx(hash); setConfirm(false); setStep('confirming')
      await pub.waitForTransactionReceipt({ hash })
      setStep('crediting'); void refresh()
    } catch (e) {
      setStep('idle'); setErr(errMsg(e))
    }
  }

  const reset = () => { setStep('idle'); setTx(null); setAmount(''); setErr(null) }
  const steps: [Step, string][] = [['signing', 'Confirm in your wallet'], ['confirming', `Confirm on ${ARBITRUM.name}`], ['crediting', 'Credited on Hyperliquid (< 1 min)']]
  const order: Step[] = ['idle', 'signing', 'confirming', 'crediting', 'done']

  return (
    <section className="card p-5" aria-labelledby="dep-h">
      <h2 id="dep-h" className="text-lg font-bold">Deposit USDC</h2>
      <p className="mt-1 text-xs text-ink-300">From your wallet on {ARBITRUM.name} straight into Hyperliquid’s bridge. Pulse never holds your funds.</p>

      <dl className="mt-4 space-y-1 text-xs">
        <div className="flex justify-between"><dt className="text-ink-400">USDC on {ARBITRUM.name}</dt><dd className="tabular font-mono">{usdc === null ? '…' : formatUnits(usdc, USDC_DECIMALS)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-400">ETH for gas</dt><dd className={`tabular font-mono ${noGas ? 'text-down' : ''}`}>{eth === null ? '…' : Number(formatUnits(eth, 18)).toFixed(5)}</dd></div>
      </dl>
      {noGas && <p className="mt-2 rounded-lg border border-warn/40 bg-warn/10 p-2 text-[11px] text-warn">You need a little {IS_TESTNET ? 'Arbitrum Sepolia ETH' : 'ETH on Arbitrum'} to pay the network fee.</p>}

      {step === 'idle' ? (
        <>
          <label className="label mt-4" htmlFor="dep-amt">Amount (USDC) — minimum {MIN_DEPOSIT_USDC}</label>
          <div className="flex gap-1">
            <input id="dep-amt" className="input font-mono" inputMode="decimal" placeholder={`${MIN_DEPOSIT_USDC}.00`} value={amount} onChange={(e) => setAmount(e.target.value.trim())} />
            <button className="btn-ghost px-3 text-xs" onClick={() => usdc !== null && setAmount(formatUnits(usdc, USDC_DECIMALS))}>Max</button>
          </div>
          {error && <p className="mt-1 text-xs text-down">{error}</p>}
          {err && <p className="mt-1 text-xs text-down">{err}</p>}
          <p className="mt-2 text-[11px] text-warn">Deposits below {MIN_DEPOSIT_USDC} USDC are <b>not credited and are lost permanently</b>. Only send native USDC on {ARBITRUM.name}.</p>
          <button className="btn-primary mt-3 w-full" disabled={!amount || !!error || !w.authenticated} onClick={() => setConfirm(true)}>{w.authenticated ? 'Review deposit' : 'Connect wallet first'}</button>
        </>
      ) : (
        <ol className="mt-4 space-y-2 text-sm">
          {steps.map(([s, label]) => {
            const done = order.indexOf(step) > order.indexOf(s)
            const active = step === s
            return <li key={s} className={`flex items-center gap-2 ${done ? 'text-up' : active ? 'text-white' : 'text-ink-500'}`}><span aria-hidden>{done ? '✓' : active ? '●' : '○'}</span>{label}</li>
          })}
          {tx && <li className="text-xs"><a className="text-pulse-300 underline" href={`${ARBITRUM.explorer}/tx/${tx}`} target="_blank" rel="noopener noreferrer">View transaction {shortAddr(tx)}</a></li>}
          {step === 'done' && <li><button className="btn-ghost mt-1" onClick={reset}>Make another deposit</button></li>}
          {step === 'crediting' && <li className="text-xs text-ink-400">Your funds are safe in the bridge; crediting normally takes under a minute.</li>}
        </ol>
      )}

      {confirm && (
        <Modal title="Confirm deposit" onClose={() => step === 'idle' && setConfirm(false)}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-400">Amount</dt><dd className="font-mono">{amount} USDC</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">Network</dt><dd>{ARBITRUM.name}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-400">To (HL bridge)</dt><dd className="break-all text-right font-mono text-xs">{BRIDGE.address}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">Credited to</dt><dd className="font-mono text-xs">{shortAddr(w.address)} (you)</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">Min / ETA</dt><dd>{MIN_DEPOSIT_USDC} USDC / under 1 min</dd></div>
          </dl>
          <p className="mt-3 text-[11px] text-ink-400">This is a plain USDC transfer to Hyperliquid’s official bridge contract; check the address in your wallet prompt matches.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-ghost" disabled={step !== 'idle'} onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn-primary" disabled={step !== 'idle'} onClick={send}>{step === 'signing' ? 'Waiting for wallet…' : 'Deposit'}</button>
          </div>
        </Modal>
      )}
    </section>
  )
}
