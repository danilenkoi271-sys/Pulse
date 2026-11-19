import { useEffect, useRef, useState } from 'react'
import { useWalletApi } from '@/wallet/context'
import { shortAddr } from '@/lib/format/numbers'
import { toast } from '@/stores/toasts'

export function ConnectButton({ className = '', size = 'sm' }: { className?: string; size?: 'sm' | 'md' }) {
  const w = useWalletApi()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const sz = size === 'sm' ? 'btn-sm' : ''

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('mousedown', away)
    return () => window.removeEventListener('mousedown', away)
  }, [open])

  if (!w.configured) return <button className={`btn ${sz} ${className}`} disabled title="Set VITE_PRIVY_APP_ID to enable wallet login">Connect</button>
  if (!w.ready) return <button className={`btn ${sz} ${className}`} disabled>…</button>
  if (!w.authenticated) return <button className={`btn-lime ${sz} ${className}`} onClick={w.login}>Connect</button>

  return (
    <div className="relative" ref={ref}>
      <button className={`btn ${sz} ${className}`} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="h-1.5 w-1.5 bg-up" />{shortAddr(w.address)}
      </button>
      {open && (
        <div className="ticks absolute right-0 z-50 mt-1 w-72 border border-line2 p-4 shadow-[0_20px_50px_rgba(0,0,0,.7)]">
          <p className="k">{w.isEmbedded ? 'Embedded wallet' : 'External wallet'}{w.label ? ` · ${w.label}` : ''}</p>
          <p className="mt-2 break-all font-mono text-[11px] text-bone">{w.address}</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="btn btn-sm" onClick={() => { void navigator.clipboard?.writeText(w.address ?? ''); toast.info('Address copied') }}>Copy</button>
            <button className="btn btn-sm" onClick={() => { setOpen(false); void w.logout() }}>Disconnect</button>
          </div>
        </div>
      )}
    </div>
  )
}
