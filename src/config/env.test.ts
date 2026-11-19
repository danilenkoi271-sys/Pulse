import { describe, expect, it } from 'vitest'
import { isAddress } from 'viem'
import { builderFeeToPercent, BRIDGE, NETWORK } from './env'

describe('builderFeeToPercent (fee is in tenths of a basis point)', () => {
  it('converts to the percent string approveBuilderFee expects', () => {
    expect(builderFeeToPercent(1)).toBe('0.001%')
    expect(builderFeeToPercent(10)).toBe('0.01%')   // 1 bp
    expect(builderFeeToPercent(50)).toBe('0.05%')
    expect(builderFeeToPercent(100)).toBe('0.1%')   // Hyperliquid perps cap
  })
})

describe('real-money constants', () => {
  it('defaults to mainnet (testnet only when explicitly requested)', () => {
    expect(NETWORK).toBe('mainnet')
  })
  it('bridge and USDC addresses are valid EIP-55 checksummed addresses', () => {
    expect(isAddress(BRIDGE.address, { strict: true })).toBe(true)
    expect(isAddress(BRIDGE.usdc, { strict: true })).toBe(true)
  })
  it('mainnet constants are the documented Arbitrum One bridge + native USDC', () => {
    expect(BRIDGE.address).toBe('0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7')
    expect(BRIDGE.usdc).toBe('0xaf88d065e77c8cC2239327C5EDb3A432268e5831')
  })
})
