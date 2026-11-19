import { useState } from 'react'
import { useWalletApi } from '@/wallet/context'
import { useAccount } from '@/stores/account'
import { useMainExchange } from '@/hooks/useMainExchange'
import { errMsg } from '@/lib/hl/trade'
import { toast } from '@/stores/toasts'
import { Modal } from '@/components/ui/Modal'

export function AccountModeCard() {
  const w = useWalletApi()
  const getEx = useMainExchange()
  const { mode, address } = useAccount()
  const [target, setTarget] = useState<'unifiedAccount' | 'disabled' | null>(null)
  const [busy, setBusy] = useState(false)
  if (!mode) return null
  const unified = mode === 'unifiedAccount'
  const portfolio = mode === 'portfolioMargin'

  const apply = async () => {
    if (!address || !target) return
    setBusy(true)
    try {
      await (await getEx()).userSetAbstraction({ user: address, abstraction: target })
      toast.success('Account mode updated')
      useAccount.setState({ mode: target === 'disabled' ? 'disabled' : target })
      setTarget(null)
    } catch (e) { toast.error('Could not change mode', errMsg(e)) } finally { setBusy(false) }
  }

  return (
    <section className="card p-5" aria-labelledby="am-h">
      <h2 id="am-h" className="text-lg font-bold">Account mode</h2>
      <p className="mt-1 text-sm text-ink-300">Current: <b className="text-white">{portfolio ? 'Portfolio margin' : unified ? 'Unified account' : 'Standard'}</b></p>
      <p className="mt-2 text-xs leading-relaxed text-ink-400">
        {unified ? 'One USDC balance backs spot, perps and HIP-3 markets — no transfers needed.' : portfolio ? 'Portfolio margin pools eligible assets as collateral. Manage it on Hyperliquid.' : 'Standard keeps separate balances for perps, spot and each HIP-3 dex. Unified accounts share one balance across all of them and are simpler for most traders (limited to 50,000 actions/day).'}
      </p>
      {!portfolio && (
        <button className="btn-ghost mt-3" disabled={!w.authenticated} onClick={() => setTarget(unified ? 'disabled' : 'unifiedAccount')}>{unified ? 'Switch back to standard' : 'Switch to unified account'}</button>
      )}
      {target && (
        <Modal title="Change account mode" onClose={() => !busy && setTarget(null)}>
          <p className="text-sm text-ink-200">{target === 'unifiedAccount' ? 'Your spot and perps USDC will be merged into a single balance that collateralizes all cross-margin positions. You can switch back later.' : 'Balances will be separated into perps, spot and per-dex balances again.'}</p>
          <p className="mt-2 text-xs text-warn">Open positions and orders stay as they are, but available balances and margin calculations change. Close risky positions first if unsure.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-ghost" disabled={busy} onClick={() => setTarget(null)}>Cancel</button>
            <button className="btn-primary" disabled={busy} onClick={apply}>{busy ? 'Waiting for wallet…' : 'Confirm'}</button>
          </div>
        </Modal>
      )}
    </section>
  )
}
