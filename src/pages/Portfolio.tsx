import { useEffect } from 'react'
import { useAccount } from '@/stores/account'
import { useMarkets } from '@/stores/markets'
import { useWalletApi } from '@/wallet/context'
import { AccountPanel } from '@/components/account/AccountPanel'
import { ProfileCard } from '@/components/account/ProfileCard'
import { ConnectButton } from '@/components/layout/ConnectButton'
import { fmtUsd, num } from '@/lib/format/numbers'

export default function Portfolio() {
  const w = useWalletApi()
  const init = useMarkets((s) => s.init)
  const { dexSummary, positions, spot, address } = useAccount()
  useEffect(() => { void init() }, [init])

  const equity = Object.values(dexSummary).reduce((s, d) => s + d.accountValue, 0)
  const free = Object.values(dexSummary).reduce((s, d) => s + d.withdrawable, 0)
  const pnl = positions.reduce((s, p) => s + p.unrealizedPnl, 0)
  const spotUsdc = num(spot.find((b) => b.coin === 'USDC')?.total)
  const stats: [string, string, string][] = [
    ['Perps equity', fmtUsd(equity), ''],
    ['Spot USDC', fmtUsd(spotUsdc), ''],
    ['Unrealized PnL', fmtUsd(pnl, { sign: true }), pnl > 0 ? 'text-up' : pnl < 0 ? 'text-down' : ''],
    ['Free to withdraw', fmtUsd(free), ''],
  ]
  return (
    <div className="mx-auto max-w-[1500px] px-3 py-6 sm:px-6">
      <p className="k">{address ? `${address.slice(0, 6)}…${address.slice(-4)}` : 'Not connected'}</p>
      <h1 className="display mt-1 text-[clamp(38px,6vw,64px)] text-bone">Portfolio</h1>
      {!w.authenticated && !address && <div className="plate mt-6 flex flex-wrap items-center justify-between gap-3 p-5 text-[13px] text-mute">Connect a wallet to see your Hyperliquid account.<ConnectButton size="md" /></div>}
      <div className="mt-6 grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
        {stats.map(([k, v, cls]) => (
          <div key={k} className="bg-plate p-4 sm:p-5"><div className="k">{k}</div><div className={`display-wide mt-2 text-[clamp(20px,3vw,30px)] ${cls || 'text-bone'}`}>{v}</div></div>
        ))}
      </div>
      <div className="plate mt-6"><AccountPanel /></div>
      <div className="mt-6"><ProfileCard /></div>
    </div>
  )
}
