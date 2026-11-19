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
  if (!BUILDER || !w.authenticated || !w.address || builder.active) return null

  const run = async () => {
    try {
      if (await approve(await getEx(), w.address!)) toast.success('Fee approved')
    } catch (e) { toast.error('Approval failed', e instanceof Error ? e.message : String(e)) }
  }
  return (
    <div className="border border-lime/50 p-3">
      <p className="k !text-lime">Pulse fee · {builderFeeToPercent(BUILDER.fee)} per trade <Help text="Pulse adds this on top of Hyperliquid's own fees. You approve a maximum once with your main wallet (a free signature, no gas), see it on every order, and can revoke it on Hyperliquid any time." /></p>
      <p className="mt-1.5 text-[12px] text-mute">Approve once to trade here. Your funds are never touched.</p>
      {error && <p className="mt-1 text-[11px] text-down">{error}</p>}
      <button className="btn-lime btn-sm mt-2 w-full" disabled={status === 'working' || status === 'checking'} onClick={run}>{status === 'working' ? 'Waiting…' : status === 'checking' ? 'Checking…' : `Approve ${builderFeeToPercent(BUILDER.fee)}`}</button>
    </div>
  )
}
