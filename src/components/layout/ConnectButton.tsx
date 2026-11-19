import { useState } from 'react'
import { useWalletApi } from '@/wallet/context'
import { shortAddr } from '@/lib/format/numbers'

export function ConnectButton({ className = '' }: { className?: string }) {
  const w = useWalletApi()
  const [open, setOpen] = useState(false)

  if (!w.configured) {
    return (
      <button className={`btn-ghost ${className}`} disabled title="Set VITE_PRIVY_APP_ID to enable wallet login">
        Connect
      </button>
    )
  }
  if (!w.ready) return <button className={`btn-ghost ${className}`} disabled>…</button>
  if (!w.authenticated) {
    return <button className={`btn-primary ${className}`} onClick={w.login}>Connect</button>
  }
  return (
    <div className="relative">
      <button className={`btn-ghost font-mono ${className}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="h-2 w-2 rounded-full bg-up" />
        {shortAddr(w.address)}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-ink-600 bg-ink-850 p-3 shadow-2xl" onMouseLeave={() => setOpen(false)}>
          <p className="text-xs text-ink-400">{w.isEmbedded ? 'Embedded wallet' : 'External wallet'}{w.label ? ` · ${w.label}` : ''}</p>
          <p className="mt-1 break-all font-mono text-xs text-ink-200">{w.address}</p>
          <button className="btn-ghost mt-3 w-full" onClick={() => navigator.clipboard?.writeText(w.address ?? '')}>Copy address</button>
          <button className="btn-ghost mt-2 w-full" onClick={() => { setOpen(false); void w.logout() }}>Disconnect</button>
        </div>
      )}
    </div>
  )
}
