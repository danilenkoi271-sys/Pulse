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
    <section id="one-click" className="ticks p-5" aria-labelledby="oc-h">
      <div className="flex items-start justify-between">
        <div><p className="k !text-lime">05</p><h2 id="oc-h" className="display mt-1 text-[34px] text-bone">One-click trading</h2></div>
        <span className={`border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-caps ${status === 'active' ? 'border-lime text-lime' : 'border-line2 text-dim'}`}>{status === 'active' ? 'On' : 'Off'}</span>
      </div>
      <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-mute">
        Approve a separate <b>agent wallet</b> once and place orders without a wallet popup each time. The agent key is generated in your browser and stored only on this device.
        It can place and cancel orders — <b>it can never withdraw or transfer funds</b>. Those always need your main wallet.
      </p>
      {agent && (
        <div className="mt-4 max-w-sm space-y-2">
          <div className="rcpt"><span className="l">Agent address</span><span className="d" /><span className="v">{shortAddr(agent.address)}</span></div>
          <div className="rcpt"><span className="l">Expires</span><span className="d" /><span className="v">{new Date(agent.validUntil).toLocaleDateString()}</span></div>
        </div>
      )}
      {error && <p className="mt-3 text-[12px] text-down">{error}</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        {status !== 'active' ? (
          <button className="btn-lime" disabled={!w.authenticated || working} onClick={() => setConfirm('enable')}>{working ? 'Working…' : 'Enable one-click trading'}</button>
        ) : (
          <>
            <button className="btn" disabled={working} onClick={() => setConfirm('revoke')}>Revoke agent</button>
            <button className="btn" disabled={working} onClick={() => { forget(); toast.info('Local agent key removed') }}>Forget key on this device</button>
          </>
        )}
      </div>
      <p className="mt-4 text-[12px] text-dim">Anyone with access to this browser profile could trade with the agent key (never withdraw). Don’t enable it on shared devices.</p>

      {confirm && (
        <Modal title={confirm === 'enable' ? 'Enable one-click trading' : 'Revoke agent'} onClose={() => !working && setConfirm(null)}>
          <p className="text-[13px] leading-relaxed text-text">
            {confirm === 'enable'
              ? 'Your main wallet will sign a one-time approval for a new trading-only agent wallet named “Pulse”, valid for 30 days.'
              : 'Your main wallet will sign a message that replaces the agent on Hyperliquid, permanently disabling the old key. The local key is then deleted.'}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button className="btn" disabled={working} onClick={() => setConfirm(null)}>Cancel</button>
            <button className="btn-lime" disabled={working} onClick={run}>{working ? 'Check wallet…' : 'Continue'}</button>
          </div>
        </Modal>
      )}
    </section>
  )
}
