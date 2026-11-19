import { describe, expect, it } from 'vitest'
import { parseUsdc, validateDeposit, validateTransfer, validateWithdraw } from './funds'

const ADDR = '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7'
describe('parseUsdc', () => {
  it('parses plain decimals to 6dp base units', () => {
    expect(parseUsdc('5')).toBe(5_000_000n)
    expect(parseUsdc('12.345678')).toBe(12_345_678n)
  })
  it('rejects junk, signs, exponents, >6 decimals and zero', () => {
    for (const s of ['', '0', '0.0', '-5', '1e6', '1.1234567', 'abc', '1,5', ' ', '0x10']) expect(parseUsdc(s)).toBeNull()
  })
})
describe('validateDeposit', () => {
  const bal = 100_000_000n // 100 USDC
  it('blocks below the 5 USDC minimum (funds would be lost)', () => {
    expect(validateDeposit('4.99', bal)).toMatch(/Minimum/)
    expect(validateDeposit('1', bal)).toMatch(/Minimum/)
  })
  it('accepts exactly the minimum and up to the balance', () => {
    expect(validateDeposit('5', bal)).toBeNull()
    expect(validateDeposit('100', bal)).toBeNull()
  })
  it('blocks more than the balance', () => expect(validateDeposit('100.000001', bal)).toMatch(/exceeds/))
})
describe('validateWithdraw', () => {
  it('requires amount > fee, ≤ withdrawable, and a valid address', () => {
    expect(validateWithdraw('1', 50, ADDR)).toMatch(/fee/)
    expect(validateWithdraw('2', 50, ADDR)).toBeNull()
    expect(validateWithdraw('51', 50, ADDR)).toMatch(/withdrawable/)
    expect(validateWithdraw('10', 50, '0x123')).toMatch(/address/)
    expect(validateWithdraw('10', 50, '')).toMatch(/address/)
  })
})
describe('validateTransfer', () => {
  it('bounds by available', () => {
    expect(validateTransfer('5', 10)).toBeNull()
    expect(validateTransfer('11', 10)).toMatch(/exceeds/)
    expect(validateTransfer('x', 10)).not.toBeNull()
  })
})
