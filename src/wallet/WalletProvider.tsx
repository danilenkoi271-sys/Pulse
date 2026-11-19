import { lazy, Suspense, type ReactNode } from 'react'
import { PRIVY_APP_ID } from '@/config/env'

// Privy is ~1.5 MB: load it as its own chunk, in parallel with the app shell.
const PrivyWallet = lazy(() => import('./PrivyWallet'))

export function WalletProvider({ children }: { children: ReactNode }) {
  // No app id → default (read-only) context: markets/charts work, trading is disabled.
  if (!PRIVY_APP_ID) return <>{children}</>
  return (
    <Suspense fallback={null}>
      <PrivyWallet>{children}</PrivyWallet>
    </Suspense>
  )
}
