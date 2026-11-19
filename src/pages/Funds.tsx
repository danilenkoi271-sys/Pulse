import { useWalletApi } from '@/wallet/context'
import { DepositCard } from '@/components/funds/DepositCard'
import { WithdrawCard } from '@/components/funds/WithdrawCard'
import { TransferCard } from '@/components/funds/TransferCard'
import { AgentCard } from '@/components/funds/AgentCard'
import { AccountModeCard } from '@/components/funds/AccountModeCard'
import { ConnectButton } from '@/components/layout/ConnectButton'
import { ARBITRUM, IS_TESTNET } from '@/config/env'

export default function Funds() {
  const w = useWalletApi()
  return (
    <div className="mx-auto max-w-[1200px] px-3 py-6 sm:px-6">
      <p className="k">{ARBITRUM.name}{IS_TESTNET ? ' · testnet' : ''}</p>
      <h1 className="display mt-1 text-[clamp(38px,6vw,64px)] text-bone">Funds</h1>
      <p className="mt-3 max-w-xl text-[13px] text-mute">Money moves between your wallet and Hyperliquid directly. Pulse never sits in the middle.</p>
      {!w.authenticated && (
        <div className="plate mt-6 flex flex-wrap items-center justify-between gap-3 p-5 text-[13px] text-mute">Connect a wallet to deposit, withdraw and manage one-click trading.<ConnectButton size="md" /></div>
      )}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <DepositCard />
        <WithdrawCard />
        <TransferCard />
        <AccountModeCard />
        <div className="md:col-span-2"><AgentCard /></div>
      </div>
    </div>
  )
}
