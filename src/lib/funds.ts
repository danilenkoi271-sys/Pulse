import { isAddress, parseUnits } from 'viem'
import { MIN_DEPOSIT_USDC, WITHDRAW_FEE_USDC } from '@/config/env'

export const USDC_DECIMALS = 6
const AMOUNT_RE = /^\d+(\.\d{1,6})?$/

/** Strict USDC amount → base units (6 decimals). Returns null for anything that is not a plain decimal. */
export function parseUsdc(s: string): bigint | null {
  const t = s.trim()
  if (!AMOUNT_RE.test(t)) return null
  const v = parseUnits(t, USDC_DECIMALS)
  return v > 0n ? v : null
}

/** Deposit to Hyperliquid's bridge. Below the minimum, funds are NOT credited and are lost. */
export function validateDeposit(amount: string, balance: bigint | null): string | null {
  const v = parseUsdc(amount)
  if (v === null) return 'Enter a valid USDC amount (up to 6 decimals).'
  if (v < parseUnits(String(MIN_DEPOSIT_USDC), USDC_DECIMALS)) return `Minimum deposit is ${MIN_DEPOSIT_USDC} USDC — smaller deposits are lost.`
  if (balance !== null && v > balance) return 'Amount exceeds your USDC balance on Arbitrum.'
  return null
}

/** Withdrawal: pays a flat fee, so the amount must exceed it. `withdrawable` in whole USDC. */
export function validateWithdraw(amount: string, withdrawable: number, destination: string): string | null {
  const v = parseUsdc(amount)
  if (v === null) return 'Enter a valid USDC amount (up to 6 decimals).'
  const n = Number(amount)
  if (n <= WITHDRAW_FEE_USDC) return `Amount must be greater than the ${WITHDRAW_FEE_USDC} USDC fee.`
  if (n > withdrawable + 1e-9) return 'Amount exceeds your withdrawable balance.'
  if (!isAddress(destination, { strict: false })) return 'Enter a valid destination address.'
  return null
}

export function validateTransfer(amount: string, available: number): string | null {
  if (parseUsdc(amount) === null) return 'Enter a valid USDC amount (up to 6 decimals).'
  if (Number(amount) > available + 1e-9) return 'Amount exceeds the available balance.'
  return null
}

export const ERC20_ABI = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'transfer', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'v', type: 'uint256' }], outputs: [{ type: 'bool' }] },
] as const
