import { useCallback } from 'react'
import type { ExchangeClient } from '@nktkas/hyperliquid'
import { exchangeFor, walletAdapter } from '@/lib/hl/clients'
import { useWalletApi } from '@/wallet/context'

/**
 * Returns a function producing the ExchangeClient used for trading actions (orders, cancels, leverage).
 * Stage 2: signs with the main wallet. Stage 3 swaps in the locally stored agent key when one-click
 * trading is enabled — withdrawals and approvals always use `useMainExchange` instead.
 */
export function useTradeExchange() {
  const w = useWalletApi()
  return useCallback(async (): Promise<ExchangeClient> => exchangeFor(walletAdapter(await w.getMainWalletClient())), [w])
}
