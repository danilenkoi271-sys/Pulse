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
    <section className="ticks p-5" aria-labelledby="am-h">
      <p className="k !text-lime">04</p>
      <h2 id="am-h" className="display mt-1 text-[34px] text-bone">Account mode</h2>
      <p className="mt-2 k">Current <span className="text-lime">{portfolio ? 'Portfolio margin' : unified ? 'Unified' : 'Standard'}</span></p>
      <p className="mt-3 text-[13px] leading-relaxed text-mute">
        {unified ? 'One USDC balance backs spot, perps and HIP-3 markets — no transfers needed.' : portfolio ? 'Portfolio margin pools eligible assets as collateral. Manage it on Hyperliquid.' : 'Standard keeps separate balances for perps, spot and each HIP-3 dex. Unified accounts share one balance across all of them and are simpler for most traders (limited to 50,000 actions/day).'}
      </p>
      {!portfolio && (
        <button className="btn mt-4" disabled={!w.authenticated} onClick={() => setTarget(unified ? 'disabled' : 'unifiedAccount')}>{unified ? 'Switch back to standard' : 'Switch to unified account'}</button>
      )}
      {target && (
        <Modal title="Change account mode" onClose={() => !busy && setTarget(null)}>
          <p className="text-[13px] leading-relaxed text-text">{target === 'unifiedAccount' ? 'Your spot and perps USDC will be merged into a single balance that collateralizes all cross-margin positions. You can switch back later.' : 'Balances will be separated into perps, spot and per-dex balances again.'}</p>
          <p className="mt-3 border-l-2 border-warn pl-2 text-[12px] text-warn">Open positions and orders stay as they are, but available balances and margin calculations change. Close risky positions first if unsure.</p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button className="btn" disabled={busy} onClick={() => setTarget(null)}>Cancel</button>
            <button className="btn-lime" disabled={busy} onClick={apply}>{busy ? 'Check wallet…' : 'Confirm'}</button>
          </div>
        </Modal>
      )}
    </section>
  )
}
