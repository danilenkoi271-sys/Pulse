import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { HeroTrace } from '@/components/brand/HeroTrace'
import { ConnectButton } from '@/components/layout/ConnectButton'
import { NetworkBadge } from '@/components/layout/NetworkBadge'
import { StatusBar } from '@/components/layout/StatusBar'
import { PriceCell } from '@/components/market/PriceCell'
import { useMarkets } from '@/stores/markets'
import { BUILDER, MIN_DEPOSIT_USDC, WITHDRAW_ETA, WITHDRAW_FEE_USDC, builderFeeToPercent } from '@/config/env'
import { fmtPct, fmtUsd, fundingHourlyPct, pctChange } from '@/lib/format/numbers'

const SCHEMA_TEXT = { fill: '#e9e3d3', fontFamily: '"Geist Mono Variable", monospace' } as const

function MoneyPath() {
  return (
    <svg viewBox="0 0 900 330" className="w-full" role="img" aria-label="Diagram: your wallet signs orders that go straight to Hyperliquid. Pulse only serves the web page and is not in the money path.">
      {/* you */}
      <rect x="10" y="40" width="250" height="120" fill="#121110" stroke="#3b372d" />
      <text x="28" y="72" {...SCHEMA_TEXT} fontSize="11" letterSpacing="2" fill="#6b6657">YOU</text>
      <text x="28" y="104" {...SCHEMA_TEXT} fontSize="19" fontWeight="600">Wallet or Privy</text>
      <text x="28" y="130" {...SCHEMA_TEXT} fontSize="12" fill="#9b9585">holds the main key</text>
      <text x="28" y="148" {...SCHEMA_TEXT} fontSize="12" fill="#9b9585">signs every order</text>
      {/* hyperliquid */}
      <rect x="640" y="40" width="250" height="120" fill="#121110" stroke="#d6ff3d" />
      <text x="658" y="72" {...SCHEMA_TEXT} fontSize="11" letterSpacing="2" fill="#d6ff3d">EXCHANGE</text>
      <text x="658" y="104" {...SCHEMA_TEXT} fontSize="19" fontWeight="600">Hyperliquid</text>
      <text x="658" y="130" {...SCHEMA_TEXT} fontSize="12" fill="#9b9585">custody · matching</text>
      <text x="658" y="148" {...SCHEMA_TEXT} fontSize="12" fill="#9b9585">settlement</text>
      {/* signed order path */}
      <path d="M260 100H640" stroke="#d6ff3d" strokeWidth="2" />
      <path d="M628 92L640 100L628 108" stroke="#d6ff3d" strokeWidth="2" fill="none" />
      <text x="450" y="88" textAnchor="middle" {...SCHEMA_TEXT} fontSize="12" fill="#d6ff3d">signed order · USDC</text>
      <text x="450" y="124" textAnchor="middle" {...SCHEMA_TEXT} fontSize="11" fill="#6b6657">browser → exchange, direct</text>
      {/* pulse */}
      <rect x="260" y="230" width="380" height="80" fill="none" stroke="#3b372d" strokeDasharray="5 5" />
      <text x="278" y="258" {...SCHEMA_TEXT} fontSize="11" letterSpacing="2" fill="#6b6657">PULSE SERVERS</text>
      <text x="278" y="282" {...SCHEMA_TEXT} fontSize="13">serve this web page. That is all.</text>
      <text x="278" y="300" {...SCHEMA_TEXT} fontSize="11" fill="#9b9585">no keys · no funds · not in the path</text>
      <path d="M135 160V270H260" stroke="#3b372d" strokeDasharray="3 5" fill="none" />
      <text x="146" y="215" {...SCHEMA_TEXT} fontSize="11" fill="#6b6657">loads the page</text>
      <path d="M765 160V270H640" stroke="#3b372d" strokeDasharray="3 5" fill="none" />
      <g stroke="#ff5a52" strokeWidth="2.4"><path d="M690 258l16 16M706 258l-16 16" /></g>
      <text x="718" y="270" {...SCHEMA_TEXT} fontSize="11" fill="#ff5a52">no connection</text>
    </svg>
  )
}

function Counter({ n, label, note }: { n: number | string; label: string; note: string }) {
  return (
    <div className="border-b border-line p-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <p className="display text-[clamp(60px,9vw,112px)] leading-[.85] text-bone">{n}</p>
      <p className="k mt-3 !text-lime">{label}</p>
      <p className="mt-2 max-w-[28ch] text-[13px] leading-snug text-mute">{note}</p>
    </div>
  )
}

export default function Landing() {
  const { init, status, markets, ctx } = useMarkets()
  useEffect(() => { void init() }, [init])

  const stats = useMemo(() => {
    const perps = markets.filter((m) => m.kind === 'perp')
    const hip3 = markets.filter((m) => m.kind === 'hip3')
    const spot = markets.filter((m) => m.kind === 'spot')
    const byVol = (a: typeof markets) => [...a].sort((x, y) => (ctx[y.key]?.volume ?? 0) - (ctx[x.key]?.volume ?? 0))
    return {
      perps: perps.length, spot: spot.length, hip3: hip3.length,
      maxLev: Math.max(0, ...perps.map((m) => m.maxLeverage)),
      hip3Top: byVol(hip3).slice(0, 4).map((m) => m.label),
      volume: perps.reduce((s, m) => s + (ctx[m.key]?.volume ?? 0), 0),
      active: byVol([...perps, ...hip3]).slice(0, 7),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markets, status])

  const btc = ctx['BTC']
  const ready = status === 'ready'

  return (
    <div className="min-h-full pb-10">
      <header className="border-b border-line">
        <div className="mx-auto flex h-14 max-w-[1300px] items-center gap-6 px-4 sm:px-6">
          <Logo size={28} />
          <nav className="ml-4 hidden gap-6 md:flex">
            {[['#board', 'The board'], ['#path', 'Where the money sits'], ['#start', 'Start'], ['#costs', 'Costs']].map(([h, l]) => <a key={h} href={h} className="k hover:text-bone">{l}</a>)}
          </nav>
          <div className="ml-auto flex items-center gap-3"><NetworkBadge /><Link to="/trade" className="btn btn-sm hidden sm:inline-flex">Terminal</Link><ConnectButton /></div>
        </div>
      </header>

      {/* ---- hero ---- */}
      <section className="mx-auto max-w-[1300px] px-4 pb-10 pt-12 sm:px-6 sm:pt-20">
        <p className="k animate-rise !text-lime">Non-custodial front end for Hyperliquid</p>
        <h1 className="display mt-4 animate-rise text-[clamp(64px,13vw,190px)] text-bone" style={{ animationDelay: '.06s' }}>
          Your keys.<br /><span className="text-lime">Their order book.</span>
        </h1>
        <div className="mt-8 grid items-end gap-8 md:grid-cols-[1fr_auto]">
          <p className="max-w-xl animate-rise text-[16px] leading-relaxed text-mute" style={{ animationDelay: '.14s' }}>
            Pulse is a trading screen for Hyperliquid perps, spot and stock markets. Orders are signed in your browser and go straight to the exchange. There is no Pulse account, no Pulse custody and no Pulse server anywhere in the money path.
          </p>
          <div className="flex animate-rise flex-wrap gap-3" style={{ animationDelay: '.2s' }}>
            <Link to="/trade" className="btn-lime h-12 px-7 text-[12px]">Open the terminal</Link>
            <Link to="/markets" className="btn h-12 px-7 text-[12px]">See the board</Link>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-plate" aria-label="Live BTC heartbeat">
        <div className="mx-auto max-w-[1300px]">
          <div className="flex items-center justify-between px-4 pt-4 sm:px-6"><p className="k">BTC · 5 minute returns · live</p><p className="k hidden sm:block">flat = quiet · spike = the market moving</p></div>
          <HeroTrace />
          <div className="grid grid-cols-2 border-t border-line sm:grid-cols-4">
            {[
              ['BTC mark', <PriceCell key="p" mkey="BTC" className="text-[18px] text-bone" />],
              ['24h', <span key="c" className={btc && pctChange(btc.mark, btc.prevDay) >= 0 ? 'text-up' : 'text-down'}>{btc ? fmtPct(pctChange(btc.mark, btc.prevDay)) : '—'}</span>],
              ['Funding / h', btc ? fmtPct(fundingHourlyPct(btc.funding), 4) : '—'],
              ['Perp volume 24h', ready ? fmtUsd(stats.volume, { compact: true }) : '—'],
            ].map(([k, v], i) => (
              <div key={String(k)} className={`px-4 py-4 sm:px-6 ${i > 0 ? 'sm:border-l sm:border-line' : ''} ${i % 2 === 1 ? 'border-l border-line sm:border-l' : ''}`}>
                <p className="k">{k}</p><p className="num mt-1 text-[18px] text-bone">{v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- the board ---- */}
      <section id="board" className="mx-auto max-w-[1300px] px-4 py-20 sm:px-6">
        <p className="k !text-lime">01 · The board</p>
        <h2 className="display mt-2 text-[clamp(40px,6vw,76px)] text-bone">One screen. Three kinds of market.</h2>
        <div className="mt-10 grid border border-line bg-plate sm:grid-cols-3">
          <Counter n={ready ? stats.perps : '—'} label="Crypto perps" note={ready ? `Up to ${stats.maxLev}× on the majors. BTC, ETH, SOL, LTC and the long tail.` : 'Loading…'} />
          <Counter n={ready ? stats.hip3 : '—'} label="Stocks & commodities" note={ready && stats.hip3Top.length ? `HIP-3 perps from trade[XYZ]: ${stats.hip3Top.join(', ')}.` : 'HIP-3 perps from trade[XYZ].'} />
          <Counter n={ready ? stats.spot : '—'} label="Spot pairs" note="Buy and sell tokens against USDC straight off the Hyperliquid book." />
        </div>

        <div className="mt-6 border border-line bg-plate">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5"><p className="k">Most active right now</p><Link to="/markets" className="k !text-lime hover:!text-bone">All markets →</Link></div>
          {!ready && <p className="p-6 font-mono text-[12px] text-dim">Loading live prices…</p>}
          {stats.active.map((m) => {
            const c = ctx[m.key]
            const ch = c ? pctChange(c.mark, c.prevDay) : 0
            return (
              <Link key={m.key} to={`/trade/${encodeURIComponent(m.key)}`} className="group rowline grid grid-cols-[1fr_auto_auto] items-baseline gap-4 border-l-2 border-transparent px-4 py-3 hover:border-lime hover:bg-raise sm:grid-cols-[1fr_1fr_1fr_1fr]">
                <span className="font-mono text-[15px] font-semibold text-bone group-hover:text-lime">{m.label} <span className="k ml-1">{m.kind === 'hip3' ? m.dex : 'perp'}</span></span>
                <PriceCell mkey={m.key} className="text-right text-[14px] text-bone sm:text-left" />
                <span className={`num w-20 text-right text-[13px] sm:w-auto sm:text-left ${ch >= 0 ? 'text-up' : 'text-down'}`}>{fmtPct(ch)}</span>
                <span className="num hidden text-right text-[13px] text-mute sm:block">{fmtUsd(c?.volume, { compact: true })} <span className="k">vol</span></span>
              </Link>
            )
          })}
        </div>
      </section>

      {/* ---- where the money sits ---- */}
      <section id="path" className="border-y border-line bg-plate">
        <div className="mx-auto max-w-[1300px] px-4 py-20 sm:px-6">
          <p className="k !text-lime">02 · Where the money sits</p>
          <h2 className="display mt-2 text-[clamp(40px,6vw,76px)] text-bone">Nowhere near us.</h2>
          <div className="mt-10 overflow-x-auto border border-line bg-base p-4 sm:p-8"><div className="min-w-[640px]"><MoneyPath /></div></div>

          <div className="mt-8 overflow-x-auto border border-line">
            <table className="w-full min-w-[640px] text-left">
              <thead><tr><th className="th">What</th><th className="th">Lives in</th><th className="th">Can move your money?</th></tr></thead>
              <tbody className="text-[13px]">
                {[
                  ['Main wallet key', 'Your wallet, or Privy’s embedded wallet', 'Yes. Only this key can withdraw.'],
                  ['Agent key (one-click)', 'This browser’s local storage, nowhere else', 'No. It can place and cancel orders, expires in 30 days, revocable.'],
                  ['Your USDC', 'Hyperliquid', 'Only with your main-wallet signature.'],
                  ['Pulse servers', 'Static files and a country-code header', 'No. They never see a key, an order or a balance.'],
                ].map(([a, b, c]) => <tr key={a} className="rowline"><td className="px-3 py-3.5 font-mono font-semibold text-bone">{a}</td><td className="px-3 py-3.5 text-mute">{b}</td><td className="px-3 py-3.5 text-text">{c}</td></tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ---- start ---- */}
      <section id="start" className="mx-auto max-w-[1300px] px-4 py-20 sm:px-6">
        <p className="k !text-lime">03 · Start</p>
        <h2 className="display mt-2 text-[clamp(40px,6vw,76px)] text-bone">Three steps. No account.</h2>
        <ol className="mt-10 border-t border-line">
          {[
            ['01', 'Sign in', 'Email or Google creates an embedded wallet for you. Or connect MetaMask, Rabby or Phantom and keep using the wallet you have.'],
            ['02', 'Deposit USDC', `Send USDC from Arbitrum to Hyperliquid’s bridge from your own wallet. Minimum ${MIN_DEPOSIT_USDC} USDC, credited in about a minute. Start small the first time.`],
            ['03', 'Trade, then withdraw when you like', `Orders go to the exchange as signed messages. Withdrawals cost ${fmtUsd(WITHDRAW_FEE_USDC)} and take roughly ${WITHDRAW_ETA}, signed by your main wallet.`],
          ].map(([n, t, d]) => (
            <li key={n} className="grid gap-2 border-b border-line py-8 sm:grid-cols-[120px_1fr_1.4fr] sm:items-baseline sm:gap-8">
              <span className="display text-[64px] leading-none text-line2">{n}</span>
              <h3 className="display-wide text-[22px] text-bone">{t}</h3>
              <p className="max-w-xl text-[14px] leading-relaxed text-mute">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- costs ---- */}
      <section id="costs" className="mx-auto max-w-[1300px] px-4 pb-24 sm:px-6">
        <p className="k !text-lime">04 · What it costs</p>
        <div className="mt-6 grid gap-px border border-line bg-line md:grid-cols-3">
          <div className="bg-plate p-6"><p className="k">Hyperliquid</p><p className="display-wide mt-3 text-[26px] text-bone">0.045% taker</p><p className="mt-2 text-[13px] leading-relaxed text-mute">Base tier on perps. Maker orders pay less, and rates fall as your volume grows. HIP-3 markets can add a deployer share.</p></div>
          <div className="bg-plate p-6"><p className="k">Pulse</p><p className="display-wide mt-3 text-[26px] text-bone">{BUILDER ? `${builderFeeToPercent(BUILDER.fee)} per trade` : 'Nothing, for now'}</p><p className="mt-2 text-[13px] leading-relaxed text-mute">{BUILDER ? 'An interface fee you approve once with your main wallet and see on every ticket. Revoke it any time on Hyperliquid.' : 'No interface fee is switched on. If one ever is, it is approved by you first and shown on every order.'}</p></div>
          <div className="bg-plate p-6"><p className="k">Moving money</p><p className="display-wide mt-3 text-[26px] text-bone">{fmtUsd(WITHDRAW_FEE_USDC)} out</p><p className="mt-2 text-[13px] leading-relaxed text-mute">Deposits have no Hyperliquid fee, only Arbitrum gas. Withdrawals cost {fmtUsd(WITHDRAW_FEE_USDC)}.</p></div>
        </div>
        <div className="mt-10 flex flex-wrap gap-3"><Link to="/trade" className="btn-lime h-12 px-7 text-[12px]">Open the terminal</Link><Link to="/funds" className="btn h-12 px-7 text-[12px]">Fund an account</Link></div>
      </section>

      <footer className="overflow-hidden border-t border-line">
        <div className="mx-auto max-w-[1300px] px-4 pt-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4">
            <p className="max-w-xl text-[12px] leading-relaxed text-dim">Pulse is an independent interface and is not affiliated with Hyperliquid. Leveraged trading carries a high risk of loss, including more than you expect, quickly. Not available where prohibited. Nothing here is financial advice.</p>
            <div className="flex gap-5"><Link to="/terms" className="k hover:text-bone">Terms</Link><Link to="/risk" className="k hover:text-bone">Risk disclosure</Link></div>
          </div>
          <p aria-hidden className="display select-none text-center text-[clamp(90px,24vw,360px)] leading-[.74] text-raise" style={{ fontVariationSettings: "'wdth' 100, 'wght' 900" }}>PULSE</p>
        </div>
      </footer>
      <StatusBar />
    </div>
  )
}
