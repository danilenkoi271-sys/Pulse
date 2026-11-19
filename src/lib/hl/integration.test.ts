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

  // User-signed (EIP-712) actions use a different signing scheme than orders; verify each is accepted
  // structurally: HL answers with OUR address, i.e. the typed-data signature recovered correctly.
  const userSigned = async (run: (ex: ExchangeClient, addr: `0x${string}`) => Promise<unknown>) => {
    const account = privateKeyToAccount(generatePrivateKey())
    const ex = new ExchangeClient({ transport: new HttpTransport({ isTestnet: true }), wallet: account, signatureChainId: '0x66eee' })
    let message = ''
    try { message = JSON.stringify(await run(ex, account.address)) } catch (e) { message = e instanceof Error ? e.message : String(e) }
    console.log('HL response:', message)
    expect(message.toLowerCase()).toContain(account.address.toLowerCase())
  }

  it('approveAgent (with valid_until) signature recovers', () =>
    userSigned((ex) => ex.approveAgent({ agentAddress: privateKeyToAccount(generatePrivateKey()).address, agentName: `Pulse valid_until ${Date.now() + 30 * 864e5}` })), 30_000)
  it('withdraw3 signature recovers', () => userSigned((ex, a) => ex.withdraw3({ destination: a, amount: '5' })), 30_000)
  it('sendAsset signature recovers', () =>
    userSigned((ex, a) => ex.sendAsset({ destination: a, sourceDex: '', destinationDex: 'spot', token: 'USDC:0xeb62eee3685fc4c43992febb8a5f6a24', amount: '1' })), 30_000)
})
