import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

function Doc({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/" className="k hover:text-bone">← Pulse</Link>
      <h1 className="display mt-4 text-[clamp(44px,8vw,84px)] text-bone">{title}</h1>
      <p className="mt-3 border-l-2 border-warn pl-2 text-[12px] text-warn">Template text. Have qualified counsel review and adapt it before relying on it.</p>
      <div className="mt-8 space-y-5 text-[14px] leading-relaxed text-text">{children}</div>
    </div>
  )
}
const H = ({ children }: { children: ReactNode }) => <h2 className="display-wide border-t border-line pt-5 text-[18px] text-bone">{children}</h2>

export function Risk() {
  return (
    <Doc title="Risk disclosure">
      <p>Trading perpetual futures, spot assets and other derivatives on Hyperliquid is highly speculative and involves substantial risk of loss. You can lose all of the funds you commit — and with leverage, losses can arrive far faster than gains.</p>
      <H>Leverage &amp; liquidation</H>
      <p>Leverage magnifies both profits and losses. If the market moves against a leveraged position far enough, it is liquidated and you lose the margin in it. Liquidation prices shown in Pulse are estimates; the exchange’s own calculation is authoritative.</p>
      <H>Market &amp; protocol risk</H>
      <p>Prices can gap, liquidity can vanish, and funding rates can turn expensive. Hyperliquid, its bridge, oracles, and smart contracts may contain bugs or fail. HIP-3 markets are deployed by independent builders who set oracles, leverage limits and settlement — they carry additional risk.</p>
      <H>Self-custody</H>
      <p>You control your keys. If you lose access to your wallet or sign a malicious message, nobody — including Pulse — can recover your funds. Deposits below the bridge minimum may be lost permanently.</p>
      <H>Not advice</H>
      <p>Nothing in Pulse is financial, investment, tax or legal advice. You are solely responsible for your decisions and for complying with the laws that apply to you.</p>
    </Doc>
  )
}

export function Terms() {
  return (
    <Doc title="Terms of use">
      <H>1. What Pulse is</H>
      <p>Pulse is a software interface that helps you construct and sign messages for the Hyperliquid protocol. Pulse does not custody assets, execute trades, match orders or settle anything. All of that is performed by Hyperliquid and the blockchains it uses.</p>
      <H>2. Eligibility</H>
      <p>You may only use Pulse if it is lawful for you to do so in your jurisdiction. Access may be restricted in some regions. You are responsible for your own compliance, including taxes.</p>
      <H>3. Your responsibilities</H>
      <p>You are responsible for your wallet, keys, devices and every signature you provide. One-click trading stores a trading-only agent key in your browser; clearing site data or using a shared device may expose or remove it. You can revoke agents from Hyperliquid at any time.</p>
      <H>4. Fees</H>
      <p>Hyperliquid charges its own trading fees. If an interface (builder) fee is enabled, it is shown on the order ticket and requires your one-time approval, which you can revoke.</p>
      <H>5. No warranty; limitation of liability</H>
      <p>Pulse is provided “as is”, without warranties of any kind. To the maximum extent permitted by law, the operators are not liable for any loss arising from your use of Pulse, Hyperliquid, or any third-party service.</p>
      <H>6. Changes</H>
      <p>These terms may change. Continued use means acceptance of the updated terms.</p>
    </Doc>
  )
}
