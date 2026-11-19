import { useEffect } from 'react'
import { useAccount } from '@/stores/account'
import { useMarkets } from '@/stores/markets'
import { useWalletApi } from '@/wallet/context'
import { AccountPanel } from '@/components/account/AccountPanel'
import { fmtUsd, num } from '@/lib/format/numbers'

export default function Portfolio() {
  const w = useWalletApi()
  const init = useMarkets((s) => s.init)
  const { dexSummary, positions, spot } = useAccount()
  useEffect(() => { void init() }, [init])

  const equity = Object.values(dexSummary).reduce((s, d) => s + d.accountValue, 0)
  const withdrawable = Object.values(dexSummary).reduce((s, d) => s + d.withdrawable, 0)
  const pnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0)
  const spotUsdc = num(spot.find((b) => b.coin === 'USDC')?.total)

  const stats: [string, string, string?][] = [
    ['Perps equity', fmtUsd(equity)],
    ['Spot USDC', fmtUsd(spotUsdc)],
    ['Unrealized PnL', fmtUsd(pnl, { sign: true }), pnl > 0 ? 'text-up' : pnl < 0 ? 'text-down' : ''],
    ['Withdrawable (perps)', fmtUsd(withdrawable)],
  ]
  return (
    <div className="mx-auto max-w-[1400px] space-y-4 px-3 py-5 sm:px-5">
      <h1 className="text-xl font-bold">Portfolio</h1>
      {!w.authenticated && <div className="card p-6 text-sm text-ink-300">Connect your wallet to see your Hyperliquid account.</div>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map(([k, v, cls]) => (
          <div key={k} className="card p-4"><div className="text-xs text-ink-400">{k}</div><div className={`tabular mt-1 font-mono text-xl font-semibold ${cls ?? ''}`}>{v}</div></div>
        ))}
      </div>
      <div className="card"><AccountPanel /></div>
    </div>
  )
}
