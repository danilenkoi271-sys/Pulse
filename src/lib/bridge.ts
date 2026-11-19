import type { PublicClient } from 'viem'
import { BRIDGE } from '@/config/env'
import { ERC20_ABI } from './funds'

const PAUSED_ABI = [{ type: 'function', name: 'paused', stateMutability: 'view', inputs: [], outputs: [{ type: 'bool' }] }] as const
const SYMBOL_ABI = [
  { type: 'function', name: 'symbol', stateMutability: 'view', inputs: [], outputs: [{ type: 'string' }] },
  { type: 'function', name: 'decimals', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint8' }] },
] as const

export type Preflight = { ok: true } | { ok: false; reason: string }

/**
 * Real-money safety net, run before any deposit is offered: confirms on-chain that the configured
 * bridge is a live contract that is not paused, and that the configured USDC address really is a
 * 6-decimals "USDC" token. If anything is off, deposits are blocked rather than risked.
 */
export async function bridgePreflight(pub: PublicClient): Promise<Preflight> {
  try {
    const [bridgeCode, usdcCode] = await Promise.all([pub.getCode({ address: BRIDGE.address }), pub.getCode({ address: BRIDGE.usdc })])
    if (!bridgeCode || bridgeCode === '0x') return { ok: false, reason: 'Bridge contract not found on this network.' }
    if (!usdcCode || usdcCode === '0x') return { ok: false, reason: 'USDC token contract not found on this network.' }
    const [decimals, symbol] = await Promise.all([
      pub.readContract({ address: BRIDGE.usdc, abi: SYMBOL_ABI, functionName: 'decimals' }),
      pub.readContract({ address: BRIDGE.usdc, abi: SYMBOL_ABI, functionName: 'symbol' }),
    ])
    if (decimals !== 6 || !String(symbol).startsWith('USDC')) return { ok: false, reason: `Unexpected token (${symbol}, ${decimals} decimals). Deposit blocked.` }
    try {
      const paused = await pub.readContract({ address: BRIDGE.address, abi: PAUSED_ABI, functionName: 'paused' })
      if (paused) return { ok: false, reason: 'The Hyperliquid bridge is paused. Do not deposit right now.' }
    } catch { /* contract without paused(): nothing to check */ }
    return { ok: true }
  } catch {
    return { ok: false, reason: 'Could not verify the bridge on-chain (RPC unreachable). Try again.' }
  }
}

export { ERC20_ABI }
