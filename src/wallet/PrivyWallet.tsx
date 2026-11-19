import { useCallback, useMemo, type ReactNode } from 'react'
import { PrivyProvider, usePrivy, useWallets } from '@privy-io/react-auth'
import { createWalletClient, custom, type WalletClient } from 'viem'
import { arbitrum, arbitrumSepolia } from 'viem/chains'
import { ARBITRUM, IS_TESTNET, PRIVY_APP_ID } from '@/config/env'
import { WalletContext, type WalletApi } from './context'

const chain = IS_TESTNET ? arbitrumSepolia : arbitrum

function Bridge({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout, user, getAccessToken } = usePrivy()
  const { wallets } = useWallets()

  // Prefer the wallet the user logged in with; fall back to the first connected one.
  const active = useMemo(() => {
    const primary = user?.wallet?.address?.toLowerCase()
    return wallets.find((w) => w.address.toLowerCase() === primary) ?? wallets[0] ?? null
  }, [wallets, user])

  const address = (active?.address.toLowerCase() as `0x${string}` | undefined) ?? null
  const isEmbedded = active?.walletClientType === 'privy' || active?.walletClientType === 'privy-v2'

  const getMainWalletClient = useCallback(async (): Promise<WalletClient> => {
    if (!active) throw new Error('No wallet connected.')
    // The EIP-712 domain of user-signed actions carries the chain id, and external
    // wallets refuse to sign when it differs from the active chain — so switch first.
    await active.switchChain(ARBITRUM.id)
    const provider = await active.getEthereumProvider()
    return createWalletClient({ account: active.address as `0x${string}`, chain, transport: custom(provider) })
  }, [active])

  const api = useMemo<WalletApi>(
    () => ({
      configured: true,
      ready,
      authenticated: authenticated && !!address,
      address,
      isEmbedded,
      label: user?.email?.address ?? user?.google?.email ?? null,
      userId: user?.id ?? null,
      getAccessToken: async () => (await getAccessToken()) ?? null,
      login: () => login(),
      logout: async () => {
        await logout()
      },
      getMainWalletClient,
    }),
    [ready, authenticated, address, isEmbedded, user, login, logout, getAccessToken, getMainWalletClient],
  )
  return <WalletContext.Provider value={api}>{children}</WalletContext.Provider>
}

export default function PrivyWallet({ children }: { children: ReactNode }) {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'google', 'wallet'],
        appearance: { theme: 'dark', accentColor: '#7c5cff', showWalletLoginFirst: false, walletList: ['metamask', 'rabby_wallet', 'phantom', 'detected_ethereum_wallets', 'wallet_connect'], walletChainType: 'ethereum-only' },
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
        defaultChain: chain,
        supportedChains: [chain],
      }}
    >
      <Bridge>{children}</Bridge>
    </PrivyProvider>
  )
}
