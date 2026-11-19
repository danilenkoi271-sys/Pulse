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
    <section className="ticks p-5" aria-labelledby="wd-h">
      <p className="k !text-lime">02</p>
      <h2 id="wd-h" className="display mt-1 text-[34px] text-bone">Withdraw</h2>
      <p className="mt-2 text-[13px] text-mute">Paid out on {ARBITRUM.name}. Always needs a signature from your <b className="text-bone">main wallet</b>, never the one-click agent.</p>
      <div className="mt-5 space-y-2">
        <div className="rcpt"><span className="l">Withdrawable</span><span className="d" /><span className="v">{fmtUsd(withdrawable)}</span></div>
        <div className="rcpt"><span className="l">Fee</span><span className="d" /><span className="v">{fmtUsd(WITHDRAW_FEE_USDC)}</span></div>
        <div className="rcpt"><span className="l">Arrives in</span><span className="d" /><span className="v">~{WITHDRAW_ETA}</span></div>
      </div>
      <label className="lab mt-5" htmlFor="wd-amt">Amount · USDC</label>
      <div className="flex gap-1">
        <input id="wd-amt" className="field" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.trim())} />
        <button className="btn" onClick={() => setAmount(String(Math.floor(withdrawable * 1e6) / 1e6))}>Max</button>
      </div>
      <label className="lab mt-4" htmlFor="wd-dest">Destination address</label>
      <input id="wd-dest" className="field !text-[11px]" placeholder={w.address ?? '0x…'} value={dest} onChange={(e) => setDest(e.target.value.trim())} />
      {custom && <p className="mt-2 border-l-2 border-warn pl-2 text-[12px] text-warn">Different address from your wallet. Check every character. Withdrawals can’t be reversed.</p>}
      {error && (amount || dest) && <p className="mt-1.5 text-[12px] text-down">{error}</p>}
      <button className="btn-lime mt-4 h-11 w-full" disabled={!w.authenticated || !amount || !!validateWithdraw(amount, withdrawable, destination)} onClick={() => setConfirm(true)}>Review withdrawal</button>

      {confirm && (
        <Modal title="Confirm withdrawal" onClose={() => !busy && setConfirm(false)}>
          <div className="space-y-2.5">
            <div className="rcpt"><span className="l">Amount</span><span className="d" /><span className="v">{amount} USDC</span></div>
            <div className="rcpt"><span className="l">Fee</span><span className="d" /><span className="v">{WITHDRAW_FEE_USDC} USDC</span></div>
            <div className="rcpt"><span className="l">You receive</span><span className="d" /><span className="v !text-lime">{net.toFixed(2)} USDC</span></div>
            <div className="rcpt"><span className="l">Network</span><span className="d" /><span className="v">{ARBITRUM.name}</span></div>
            <div className="rcpt"><span className="l">Arrives in</span><span className="d" /><span className="v">~{WITHDRAW_ETA}</span></div>
          </div>
          <p className="k mt-4">To</p>
          <p className="mt-1 break-all border border-line2 bg-void p-2 font-mono text-[11px] text-bone">{destination}</p>
          {err && <p className="mt-3 text-[12px] text-down">{err}</p>}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button className="btn" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button>
            <button className="btn-lime" disabled={busy} onClick={submit}>{busy ? 'Check wallet…' : 'Withdraw'}</button>
          </div>
        </Modal>
      )}
    </section>
  )
}
