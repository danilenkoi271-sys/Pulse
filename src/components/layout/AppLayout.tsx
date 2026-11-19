import { NavLink, Outlet, Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { ConnectButton } from './ConnectButton'
import { IS_TESTNET } from '@/config/env'
import { useGeoblock } from '@/hooks/useGeoblock'

const NAV = [
  { to: '/markets', label: 'Markets' },
  { to: '/trade', label: 'Trade' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/funds', label: 'Funds' },
]

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-1.5 text-sm font-medium transition ${isActive ? 'bg-ink-800 text-white' : 'text-ink-300 hover:text-white'}`

export function NetworkBadge() {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${IS_TESTNET ? 'border-warn/50 text-warn' : 'border-up/40 text-up'}`}>
      {IS_TESTNET ? 'Testnet' : 'Mainnet'}
    </span>
  )
}

export function AppLayout() {
  const geo = useGeoblock()
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-ink-700/70 bg-ink-950/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1800px] items-center gap-4 px-3 sm:px-5">
          <Link to="/" aria-label="Pulse home"><Logo /></Link>
          <nav className="ml-2 hidden items-center gap-1 md:flex" aria-label="Main">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} className={linkCls}>{n.label}</NavLink>)}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <NetworkBadge />
            <ConnectButton />
          </div>
        </div>
      </header>

      {geo.blocked && (
        <div role="alert" className="border-b border-down/40 bg-down/10 px-4 py-2 text-center text-sm text-down">
          Trading is not available in your region{geo.country ? ` (${geo.country})` : ''}. Browsing is still allowed.
        </div>
      )}

      <main className="flex-1 pb-16 md:pb-0"><Outlet context={{ geoBlocked: geo.blocked }} /></main>
      <footer className="hidden border-t border-ink-800 px-5 py-3 text-center text-[11px] text-ink-500 md:block">
        Pulse is an independent, non-custodial interface for Hyperliquid. Trading involves substantial risk of loss. <Link to="/terms" className="underline hover:text-ink-300">Terms</Link> · <Link to="/risk" className="underline hover:text-ink-300">Risk disclosure</Link>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-ink-700/70 bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden" aria-label="Mobile">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `py-3 text-center text-xs font-medium ${isActive ? 'text-pulse-300' : 'text-ink-300'}`}>{n.label}</NavLink>
        ))}
      </nav>
    </div>
  )
}

export function useGeoBlocked() {
  return useGeoblock().blocked
}
