import { useState } from 'react'
import { isAddress } from 'viem'
import { ARBITRUM, WITHDRAW_ETA, WITHDRAW_FEE_USDC } from '@/config/env'
import { useWalletApi } from '@/wallet/context'
import { useAccount } from '@/stores/account'
import { useMainExchange } from '@/hooks/useMainExchange'
import { validateWithdraw } from '@/lib/funds'
import { errMsg } from '@/lib/hl/trade'
import { toast } from '@/stores/toasts'
import { Modal } from '@/components/ui/Modal'
import { fmtUsd, num } from '@/lib/format/numbers'

export function WithdrawCard() {
  const w = useWalletApi()
  const getEx = useMainExchange()
  const { dexSummary, spot, mode } = useAccount()
  const unified = mode === 'unifiedAccount' || mode === 'portfolioMargin'
  const spotUsdc = spot.find((b) => b.coin === 'USDC')
  const withdrawable = unified ? Math.max(0, num(spotUsdc?.total) - num(spotUsdc?.hold)) : dexSummary['']?.withdrawable ?? 0

  const [amount, setAmount] = useState('')
  const [dest, setDest] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const destination = (dest || w.address || '') as string
  const custom = !!dest && dest.toLowerCase() !== w.address?.toLowerCase()
  const error = amount || dest ? validateWithdraw(amount || '0', withdrawable, destination) : null
  const net = amount && Number(amount) > WITHDRAW_FEE_USDC ? Number(amount) - WITHDRAW_FEE_USDC : 0

  const submit = async () => {
    if (validateWithdraw(amount, withdrawable, destination) || !isAddress(destination)) return
    setBusy(true); setErr(null)
    try {
      // Main wallet signs (user-signed EIP-712 action). One-click agent wallets can never do this.
      await (await getEx()).withdraw3({ destination: destination as `0x${string}`, amount })
      toast.success('Withdrawal submitted', `Funds arrive on ${ARBITRUM.name} in about ${WITHDRAW_ETA}.`)
      setConfirm(false); setAmount(''); setDest('')
    } catch (e) {
      setErr(errMsg(e))
    } finally { setBusy(false) }
  }

  return (
    <section className="card p-5" aria-labelledby="wd-h">
      <h2 id="wd-h" className="text-lg font-bold">Withdraw USDC</h2>
      <p className="mt-1 text-xs text-ink-300">Sent to {ARBITRUM.name}. Always requires a signature from your <b>main wallet</b>.</p>
      <dl className="mt-4 space-y-1 text-xs">
        <div className="flex justify-between"><dt className="text-ink-400">Withdrawable</dt><dd className="tabular font-mono">{fmtUsd(withdrawable)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-400">Fee</dt><dd className="tabular font-mono">{fmtUsd(WITHDRAW_FEE_USDC)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-400">Estimated time</dt><dd>~{WITHDRAW_ETA}</dd></div>
      </dl>
      <label className="label mt-4" htmlFor="wd-amt">Amount (USDC)</label>
      <div className="flex gap-1">
        <input id="wd-amt" className="input font-mono" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.trim())} />
        <button className="btn-ghost px-3 text-xs" onClick={() => setAmount(String(Math.floor(withdrawable * 1e6) / 1e6))}>Max</button>
      </div>
      <label className="label mt-3" htmlFor="wd-dest">Destination address</label>
      <input id="wd-dest" className="input font-mono text-xs" placeholder={w.address ?? '0x…'} value={dest} onChange={(e) => setDest(e.target.value.trim())} />
      {custom && <p className="mt-1 text-[11px] text-warn">Sending to a different address. Double-check it — withdrawals can’t be reversed.</p>}
      {error && (amount || dest) && <p className="mt-1 text-xs text-down">{error}</p>}
      <button className="btn-primary mt-3 w-full" disabled={!w.authenticated || !amount || !!validateWithdraw(amount, withdrawable, destination)} onClick={() => setConfirm(true)}>Review withdrawal</button>

      {confirm && (
        <Modal title="Confirm withdrawal" onClose={() => !busy && setConfirm(false)}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-400">Amount</dt><dd className="font-mono">{amount} USDC</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">Fee</dt><dd className="font-mono">{WITHDRAW_FEE_USDC} USDC</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">You receive</dt><dd className="font-mono font-semibold">{net.toFixed(2)} USDC</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">Network</dt><dd>{ARBITRUM.name}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-ink-400">To</dt><dd className="break-all text-right font-mono text-xs">{destination}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">ETA</dt><dd>~{WITHDRAW_ETA}</dd></div>
          </dl>
          {err && <p className="mt-2 text-xs text-down">{err}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-ghost" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn-primary" disabled={busy} onClick={submit}>{busy ? 'Waiting for wallet…' : 'Withdraw'}</button>
          </div>
        </Modal>
      )}
    </section>
  )
}
