import { BUILDER, builderFeeToPercent } from '@/config/env'
import { useBuilder } from '@/hooks/useBuilder'
import { useBuilderStore } from '@/stores/builder'
import { useMainExchange } from '@/hooks/useMainExchange'
import { useWalletApi } from '@/wallet/context'
import { Help } from '@/components/ui/Tooltip'
import { toast } from '@/stores/toasts'

/** Shown only when a builder fee is configured. One-time approval, signed by the main wallet. */
export function BuilderFeeNotice() {
  const { builder } = useBuilder()
  const w = useWalletApi()
  const getEx = useMainExchange()
  const { status, error, approve } = useBuilderStore()
  if (!BUILDER || !w.authenticated || !w.address) return null
  if (builder.active) return null // fee is shown in the ticket's fee rows instead

  const run = async () => {
    try {
      const ok = await approve(await getEx(), w.address!)
      if (ok) toast.success('Interface fee approved')
    } catch (e) { toast.error('Approval failed', e instanceof Error ? e.message : String(e)) }
  }
  return (
    <div className="rounded-lg border border-pulse-500/40 bg-pulse-600/10 p-3 text-xs">
      <p className="font-semibold text-pulse-300">Interface fee: {builderFeeToPercent(BUILDER.fee)} per trade <Help text="Pulse adds this small fee on top of Hyperliquid's fees, paid to the interface operator. You approve a maximum once with your main wallet, can see it on every order, and can revoke it on Hyperliquid at any time." /></p>
      <p className="mt-1 text-ink-300">Approve once (a free signature — no gas) to start trading on Pulse. Your funds are never touched.</p>
      {error && <p className="mt-1 text-down">{error}</p>}
      <button className="btn-primary mt-2 w-full py-1.5 text-xs" disabled={status === 'working' || status === 'checking'} onClick={run}>{status === 'working' ? 'Waiting for wallet…' : status === 'checking' ? 'Checking…' : `Approve ${builderFeeToPercent(BUILDER.fee)} fee`}</button>
    </div>
  )
}
