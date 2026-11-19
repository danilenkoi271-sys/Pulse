import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { ConnectButton } from '@/components/layout/ConnectButton'
import { NetworkBadge } from '@/components/layout/AppLayout'
import { useMarkets } from '@/stores/markets'
import { PriceCell } from '@/components/market/PriceCell'
import { fmtPct, pctChange } from '@/lib/format/numbers'
import { IS_TESTNET } from '@/config/env'

const TICKER = ['BTC', 'ETH', 'SOL', 'HYPE', 'LTC', 'xyz:TSLA', 'xyz:GOLD', 'xyz:NVDA']

function TickerItem({ k }: { k: string }) {
  const m = useMarkets((s) => s.byKey[k])
  const c = useMarkets((s) => s.ctx[k])
  if (!m || !c) return null
  const ch = pctChange(c.mark, c.prevDay)
  return (
    <Link to={`/trade/${encodeURIComponent(k)}`} className="flex shrink-0 items-center gap-2 rounded-lg border border-ink-700/70 bg-ink-900/70 px-3 py-2 text-sm hover:border-pulse-500/60">
      <span className="font-semibold">{m.label}</span>
      <PriceCell mkey={k} className="text-ink-100" />
      <span className={`tabular font-mono text-xs ${ch >= 0 ? 'text-up' : 'text-down'}`}>{fmtPct(ch)}</span>
    </Link>
  )
}

const FEATURES = [
  { t: 'Your keys, always', d: 'Pulse is only an interface. Orders are signed in your browser and sent straight to Hyperliquid. No server of ours ever sees a key or a dollar.' },
  { t: 'One-click trading', d: 'Approve a restricted agent wallet once. It can place and cancel orders but it can never withdraw — withdrawals always need your main wallet.' },
  { t: 'Perps, spot & real-world markets', d: 'Crypto perps, spot pairs, and HIP-3 stock and commodity perps like TSLA, NVDA and gold from trade[XYZ] — all in one screen.' },
  { t: 'Built for speed', d: 'One shared WebSocket streams prices, books, trades and your account. Optimistic order states, throttled book renders, instant route loads.' },
  { t: 'Clear before you click', d: 'Every order shows size, leverage, estimated liquidation price and fees up front. Tooltips explain leverage, funding and liquidation in plain English.' },
  { t: 'Transparent fees', d: 'Hyperliquid fees are shown on every ticket. If an optional interface fee is ever enabled, it is approved once by you and displayed on every order.' },
]

const STEPS = [
  ['Sign in', 'Use email or Google (an embedded wallet is created for you) or connect MetaMask, Rabby or Phantom.'],
  ['Fund', 'Deposit USDC from Arbitrum straight into Hyperliquid’s bridge from your own wallet.'],
  ['Trade', 'Place orders on a live chart. Withdraw back to your wallet whenever you like.'],
]

export default function Landing() {
  const init = useMarkets((s) => s.init)
  useEffect(() => { void init() }, [init])

  return (
    <div className="relative min-h-full overflow-x-clip">
      <div className="hero-grid pointer-events-none absolute inset-x-0 top-0 h-[720px]" />
      <div className="pointer-events-none absolute left-1/2 top-[-220px] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-pulse-600/25 blur-[120px]" />

      <header className="relative z-10 mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Logo />
        <nav className="ml-6 hidden gap-5 text-sm text-ink-300 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#how" className="hover:text-white">How it works</a>
          <a href="#safety" className="hover:text-white">Safety</a>
          <Link to="/markets" className="hover:text-white">Markets</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3"><NetworkBadge /><ConnectButton /></div>
      </header>

      <section className="relative z-10 mx-auto max-w-6xl px-4 pb-14 pt-14 text-center sm:pt-24">
        <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-ink-600 bg-ink-900/80 px-3 py-1 text-xs text-ink-200">
          <span className="h-1.5 w-1.5 animate-beat rounded-full bg-up" /> Non-custodial · built on Hyperliquid
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Trade the market’s <span className="text-gradient">pulse</span>.<br />Keep your keys.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-ink-300 sm:text-lg">
          A fast, clean interface for Hyperliquid perps, spot and stock &amp; commodity markets. All trading, custody and settlement happens on-chain — never on our servers.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/trade" className="btn-primary px-6 py-3 text-base">Launch app</Link>
          <Link to="/markets" className="btn-ghost px-6 py-3 text-base">Browse markets</Link>
        </div>
        {IS_TESTNET && <p className="mt-4 text-xs text-warn">Running on Hyperliquid testnet — no real funds at risk.</p>}

        <svg className="mx-auto mt-12 h-24 w-full max-w-3xl animate-drift" viewBox="0 0 800 100" fill="none" aria-hidden="true">
          <defs><linearGradient id="hl" x1="0" x2="1"><stop offset="0" stopColor="#7c5cff" stopOpacity="0" /><stop offset=".5" stopColor="#9a87ff" /><stop offset="1" stopColor="#4dd6ff" /></linearGradient></defs>
          <path d="M0 55h250l30-38 40 78 36-60 24 20h420" stroke="url(#hl)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>

        <div className="mx-auto mt-6 flex max-w-5xl gap-2 overflow-x-auto pb-2 sm:justify-center">
          {TICKER.map((k) => <TickerItem key={k} k={k} />)}
        </div>
      </section>

      <section id="features" className="relative z-10 mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-3xl font-bold">Everything a serious trader needs</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.t} className="card p-5 transition hover:border-pulse-500/50">
              <h3 className="font-semibold">{f.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-300">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="relative z-10 mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-3xl font-bold">From zero to first trade in three steps</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="card p-5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-pulse-500 to-ion text-sm font-bold text-ink-950">{i + 1}</span>
              <h3 className="mt-3 font-semibold">{t}</h3>
              <p className="mt-1 text-sm text-ink-300">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="safety" className="relative z-10 mx-auto max-w-4xl px-4 py-14">
        <div className="card border-pulse-500/30 p-6 sm:p-8">
          <h2 className="text-2xl font-bold">Non-custodial by design</h2>
          <ul className="mt-4 space-y-3 text-sm text-ink-200">
            <li>• <b>No backend holds funds or keys.</b> Pulse is a static web app; the only thing we may store is an optional username and settings.</li>
            <li>• <b>Agent wallets can’t withdraw.</b> One-click trading uses a separate key that lives only in your browser and is limited to trading.</li>
            <li>• <b>Withdrawals need your main wallet</b> and a fresh signature every time.</li>
            <li>• <b>Open and checkable.</b> Every action is a signed Hyperliquid message you can verify on-chain.</li>
          </ul>
          <p className="mt-5 text-xs text-ink-400">Perpetual futures are leveraged and can lose more than you expect, quickly. Read the <Link to="/risk" className="underline hover:text-ink-200">risk disclosure</Link> before trading.</p>
        </div>
      </section>

      <footer className="relative z-10 border-t border-ink-800 px-4 py-8 text-center text-xs text-ink-400">
        <div className="mb-2 flex justify-center gap-4">
          <Link to="/terms" className="hover:text-ink-200">Terms</Link>
          <Link to="/risk" className="hover:text-ink-200">Risk disclosure</Link>
        </div>
        Pulse is an independent interface and is not affiliated with Hyperliquid. Trading involves substantial risk of loss. Not available where prohibited.
      </footer>
    </div>
  )
}
