import { NavLink, Outlet, Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { ConnectButton } from './ConnectButton'
import { NetworkBadge } from './NetworkBadge'
import { StatusBar } from './StatusBar'
import { useGeoblock } from '@/hooks/useGeoblock'
import { useMarkets } from '@/stores/markets'
import { useEffect } from 'react'
import { MarketPickerTrigger } from '@/components/market/MarketPicker'

const NAV = [
  { to: '/markets', label: 'Markets' },
  { to: '/trade', label: 'Trade' },
  { to: '/portfolio', label: 'Portfolio' },
  { to: '/funds', label: 'Funds' },
]

const link = ({ isActive }: { isActive: boolean }) =>
  `relative flex h-full items-center px-4 font-mono text-[11px] font-medium uppercase tracking-caps transition-colors ${isActive ? 'text-bone after:absolute after:inset-x-4 after:bottom-0 after:h-[2px] after:bg-lime' : 'text-dim hover:text-bone'}`

export function AppLayout() {
  const geo = useGeoblock()
  const init = useMarkets((s) => s.init)
  useEffect(() => { void init() }, [init])

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-void/95 backdrop-blur-sm">
        <div className="flex h-11 items-stretch">
          <Link to="/" aria-label="Pulse home" className="flex items-center border-r border-line px-4"><Logo /></Link>
          <nav className="hidden items-stretch md:flex" aria-label="Main">{NAV.map((n) => <NavLink key={n.to} to={n.to} className={link}>{n.label}</NavLink>)}</nav>
          <div className="ml-auto flex items-center gap-3 border-l border-line px-3">
            <MarketPickerTrigger />
            <NetworkBadge />
            <ConnectButton />
          </div>
        </div>
      </header>

      {geo.blocked && (
        <div role="alert" className="border-b border-down/50 bg-down/10 px-4 py-2 text-center font-mono text-[11px] uppercase tracking-caps text-down">
          Trading is not available in your region{geo.country ? ` (${geo.country})` : ''}. Browsing still works.
        </div>
      )}

      <main className="flex-1 pb-14 md:pb-8"><Outlet context={{ geoBlocked: geo.blocked }} /></main>

      <StatusBar />
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-line bg-void pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Mobile">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={({ isActive }) => `py-3.5 text-center font-mono text-[10px] uppercase tracking-caps ${isActive ? 'border-t-2 border-lime text-bone' : 'border-t-2 border-transparent text-dim'}`}>{n.label}</NavLink>
        ))}
      </nav>
    </div>
  )
}
