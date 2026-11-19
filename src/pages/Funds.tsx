import { useWalletApi } from '@/wallet/context'
import { DepositCard } from '@/components/funds/DepositCard'
import { WithdrawCard } from '@/components/funds/WithdrawCard'
import { TransferCard } from '@/components/funds/TransferCard'
import { AgentCard } from '@/components/funds/AgentCard'
import { AccountModeCard } from '@/components/funds/AccountModeCard'
import { ConnectButton } from '@/components/layout/ConnectButton'

export default function Funds() {
  const w = useWalletApi()
  return (
    <div className="mx-auto max-w-[1100px] px-3 py-5 sm:px-5">
      <h1 className="text-xl font-bold">Funds</h1>
      <p className="mt-1 text-sm text-ink-300">Deposits and withdrawals go directly between your wallet and Hyperliquid. Pulse never touches your funds.</p>
      {!w.authenticated && (
        <div className="card mt-4 flex flex-wrap items-center justify-between gap-3 p-5 text-sm text-ink-300">Connect your wallet to deposit, withdraw and manage one-click trading.<ConnectButton /></div>
      )}
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <DepositCard />
        <WithdrawCard />
        <TransferCard />
        <AccountModeCard />
        <div className="md:col-span-2"><AgentCard /></div>
      </div>
    </div>
  )
}
