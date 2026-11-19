import { describe, expect, it } from 'vitest'
import { builderFeeToPercent } from './env'

describe('builderFeeToPercent (fee is in tenths of a basis point)', () => {
  it('converts to the percent string approveBuilderFee expects', () => {
    expect(builderFeeToPercent(1)).toBe('0.001%')
    expect(builderFeeToPercent(10)).toBe('0.01%')   // 1 bp
    expect(builderFeeToPercent(50)).toBe('0.05%')
    expect(builderFeeToPercent(100)).toBe('0.1%')   // Hyperliquid perps cap
  })
})
