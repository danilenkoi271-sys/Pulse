import { useCallback } from 'react'
import type { ExchangeClient } from '@nktkas/hyperliquid'
import { exchangeFor, walletAdapter } from '@/lib/hl/clients'
import { useWalletApi } from '@/wallet/context'
import { agentAccount, useAgent } from '@/stores/agent'

/**
 * ExchangeClient for TRADING actions only (orders, cancels, leverage). With one-click trading enabled it
 * signs locally with the agent key (no wallet popup); otherwise the main wallet signs each action.
 */
export function useTradeExchange() {
  const w = useWalletApi()
  return useCallback(async (): Promise<ExchangeClient> => {
    const { agent, status } = useAgent.getState()
    if (agent && status === 'active') return exchangeFor(agentAccount(agent))
    return exchangeFor(walletAdapter(await w.getMainWalletClient()))
  }, [w])
}

export const useOneClick = () => useAgent((s) => s.status === 'active')
