/**
 * Opt-in live checks against Hyperliquid TESTNET (run with: HL_LIVE=1 npm test).
 * Uses a throwaway key with no funds: Hyperliquid must reject the order for lack of an account,
 * and the error text proves the signature recovered to our address (i.e. encoding + signing are right).
 */
import { describe, expect, it } from 'vitest'
import { ExchangeClient, HttpTransport } from '@nktkas/hyperliquid'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { buildOrders, newCloid } from './orders'
import type { Market } from './types'

const live = process.env.HL_LIVE === '1'
const btc: Market = { key: 'BTC', coin: 'BTC', kind: 'perp', dex: '', base: 'BTC', quote: 'USDC', label: 'BTC', assetId: 0, szDecimals: 5, maxLeverage: 40, onlyIsolated: false, ctxIndex: 0, feeMult: 1 }

describe.skipIf(!live)('live testnet signing', () => {
  it('HL recovers our address from a signed order (unfunded account is rejected by address, not signature)', async () => {
    const account = privateKeyToAccount(generatePrivateKey())
    const ex = new ExchangeClient({ transport: new HttpTransport({ isTestnet: true }), wallet: account })
    const built = buildOrders(
      { market: btc, side: 'buy', kind: 'limit', size: '0.001', price: '30000', tif: 'Gtc', reduceOnly: false, leverage: 5, isCross: true, tp: '', sl: '', slippagePct: 1 },
      62000, newCloid(),
    )
    let message = ''
    try {
      const r = await ex.order({ orders: built.orders, grouping: built.grouping })
      message = JSON.stringify(r)
    } catch (e) {
      message = e instanceof Error ? e.message : String(e)
    }
    console.log('HL response:', message)
    expect(message.toLowerCase()).toContain(account.address.toLowerCase())
  }, 30_000)
})
