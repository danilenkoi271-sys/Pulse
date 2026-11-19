import { useState } from 'react'
import { useWalletApi } from '@/wallet/context'
import { useAgent } from '@/stores/agent'
import { useMainExchange } from '@/hooks/useMainExchange'
import { toast } from '@/stores/toasts'
import { shortAddr } from '@/lib/format/numbers'
import { Modal } from '@/components/ui/Modal'

export function AgentCard() {
  const w = useWalletApi()
  const getMain = useMainExchange()
  const { status, agent, error, enable, revoke, forget } = useAgent()
  const [confirm, setConfirm] = useState<'enable' | 'revoke' | null>(null)
  const working = status === 'working' || status === 'checking'

  const run = async () => {
    try {
      const ex = await getMain()
      const ok = confirm === 'enable' ? await enable(ex) : await revoke(ex)
      if (ok) { toast.success(confirm === 'enable' ? 'One-click trading enabled' : 'Agent revoked'); setConfirm(null) }
    } catch (e) { toast.error('Wallet error', e instanceof Error ? e.message : String(e)) }
  }

  return (
    <section id="one-click" className="card p-5" aria-labelledby="oc-h">
      <div className="flex items-center justify-between">
        <h2 id="oc-h" className="text-lg font-bold">One-click trading</h2>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${status === 'active' ? 'bg-up/15 text-up' : 'bg-ink-700 text-ink-300'}`}>{status === 'active' ? 'On' : 'Off'}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-300">
        Approve a separate <b>agent wallet</b> once and place orders without a wallet popup each time. The agent key is generated in your browser and stored only on this device.
        It can place and cancel orders — <b>it can never withdraw or transfer funds</b>. Those always need your main wallet.
      </p>
      {agent && (
        <dl className="mt-3 space-y-1 text-xs">
          <div className="flex justify-between"><dt className="text-ink-400">Agent address</dt><dd className="font-mono">{shortAddr(agent.address)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-400">Expires</dt><dd>{new Date(agent.validUntil).toLocaleDateString()}</dd></div>
        </dl>
      )}
      {error && <p className="mt-2 text-xs text-down">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {status !== 'active' ? (
          <button className="btn-primary" disabled={!w.authenticated || working} onClick={() => setConfirm('enable')}>{working ? 'Working…' : 'Enable one-click trading'}</button>
        ) : (
          <>
            <button className="btn-ghost" disabled={working} onClick={() => setConfirm('revoke')}>Revoke agent</button>
            <button className="btn-ghost" disabled={working} onClick={() => { forget(); toast.info('Local agent key removed') }}>Forget key on this device</button>
          </>
        )}
      </div>
      <p className="mt-3 text-[11px] text-ink-500">Anyone with access to this browser profile could trade with the agent key (never withdraw). Don’t enable it on shared devices.</p>

      {confirm && (
        <Modal title={confirm === 'enable' ? 'Enable one-click trading' : 'Revoke agent'} onClose={() => !working && setConfirm(null)}>
          <p className="text-sm text-ink-200">
            {confirm === 'enable'
              ? 'Your main wallet will sign a one-time approval for a new trading-only agent wallet named “Pulse”, valid for 30 days.'
              : 'Your main wallet will sign a message that replaces the agent on Hyperliquid, permanently disabling the old key. The local key is then deleted.'}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-ghost" disabled={working} onClick={() => setConfirm(null)}>Cancel</button>
            <button className="btn-primary" disabled={working} onClick={run}>{working ? 'Waiting for wallet…' : 'Continue'}</button>
          </div>
        </Modal>
      )}
    </section>
  )
}
