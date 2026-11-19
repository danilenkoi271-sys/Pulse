import { useCallback } from 'react'
import type { ExchangeClient } from '@nktkas/hyperliquid'
import { exchangeFor, walletAdapter } from '@/lib/hl/clients'
import { useWalletApi } from '@/wallet/context'

/**
 * ExchangeClient that ALWAYS signs with the main wallet. Required for user-signed actions:
 * approveAgent, approveBuilderFee, withdraw3, sendAsset, usdClassTransfer, userSetAbstraction.
 * Agent wallets cannot (and must never be used to) sign these.
 */
export function useMainExchange() {
  const w = useWalletApi()
  return useCallback(async (): Promise<ExchangeClient> => exchangeFor(walletAdapter(await w.getMainWalletClient())), [w])
}
