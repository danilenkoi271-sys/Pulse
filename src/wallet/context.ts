import { createContext, useContext } from 'react'
import type { WalletClient } from 'viem'

export interface WalletApi {
  /** False when VITE_PRIVY_APP_ID is missing — the app still works read-only. */
  configured: boolean
  ready: boolean
  authenticated: boolean
  /** The Hyperliquid account (lowercase 0x address). */
  address: `0x${string}` | null
  isEmbedded: boolean
  label: string | null
  /** Privy user id (stable across wallets) — only for the optional profile feature. */
  userId: string | null
  getAccessToken: () => Promise<string | null>
  login: () => void
  logout: () => Promise<void>
  /** Returns a viem WalletClient for the main wallet, switched to the signing chain (Arbitrum). */
  getMainWalletClient: () => Promise<WalletClient>
}

export const WalletContext = createContext<WalletApi>({
  configured: false,
  ready: true,
  authenticated: false,
  address: null,
  isEmbedded: false,
  label: null,
  userId: null,
  getAccessToken: async () => null,
  login: () => undefined,
  logout: async () => undefined,
  getMainWalletClient: async () => {
    throw new Error('Wallet login is not configured (missing VITE_PRIVY_APP_ID).')
  },
})

export const useWalletApi = () => useContext(WalletContext)
