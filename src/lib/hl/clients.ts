import {
  ExchangeClient,
  HttpTransport,
  InfoClient,
  SubscriptionClient,
  WebSocketTransport,
} from '@nktkas/hyperliquid'
import { ARBITRUM, IS_TESTNET } from '@/config/env'
import type { AbstractViemJsonRpcAccount, AbstractWallet } from '@nktkas/hyperliquid/signing'
import type { WalletClient } from 'viem'

/** One HTTP transport for snapshots + exchange posts. */
export const httpTransport = new HttpTransport({ isTestnet: IS_TESTNET })
export const info = new InfoClient({ transport: httpTransport })

let _ws: WebSocketTransport | null = null
let _subs: SubscriptionClient | null = null

/**
 * The ONE shared WebSocket for the whole app. The SDK transport multiplexes every
 * subscription over it, reconnects with backoff, and re-subscribes automatically.
 * Created lazily on first use.
 */
export function wsTransport(): WebSocketTransport {
  if (!_ws) {
    _ws = new WebSocketTransport({
      isTestnet: IS_TESTNET,
      resubscribe: true,
      reconnect: { maxRetries: Infinity },
      keepAlive: { interval: 20_000 },
    })
  }
  return _ws
}

export function subs(): SubscriptionClient {
  if (!_subs) _subs = new SubscriptionClient({ transport: wsTransport() })
  return _subs
}

/** Exchange client signing with `wallet` (main wallet or agent key). */
export function exchangeFor(wallet: AbstractWallet): ExchangeClient {
  return new ExchangeClient({
    transport: httpTransport,
    wallet,
    // User-signed actions (approveAgent / withdraw3 / approveBuilderFee) use this EIP-712 chain id.
    signatureChainId: ARBITRUM.hex,
  })
}

/** Adapts a viem WalletClient (Privy / injected provider) to the SDK's wallet interface. */
export function walletAdapter(client: WalletClient): AbstractWallet {
  const account = client.account
  if (!account) throw new Error('Wallet client has no account.')
  const adapter: AbstractViemJsonRpcAccount = {
    getAddresses: async () => [account.address],
    getChainId: async () => client.getChainId(),
    signTypedData: (p) =>
      client.signTypedData({ account, domain: p.domain, types: p.types, primaryType: p.primaryType, message: p.message } as Parameters<WalletClient['signTypedData']>[0]),
  }
  return adapter
}
