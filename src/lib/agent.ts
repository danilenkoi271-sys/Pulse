import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { NETWORK } from '@/config/env'

/**
 * One-click trading agent wallet.
 *
 * A random private key generated in the browser and approved on Hyperliquid by the MAIN wallet
 * (approveAgent). Hyperliquid lets an agent sign trading actions (orders, cancels, leverage) but NOT
 * withdrawals or transfers — those are user-signed EIP-712 actions that only the main wallet can sign.
 * The key lives only in this browser's localStorage and is never sent anywhere.
 */
export interface StoredAgent {
  pk: `0x${string}`
  address: `0x${string}`
  name: string
  /** ms epoch; the agent is rejected by Hyperliquid after this. */
  validUntil: number
  createdAt: number
}

export const AGENT_NAME = 'Pulse'
export const AGENT_TTL_MS = 30 * 24 * 3600 * 1000 // 30 days (Hyperliquid allows up to 180)

const keyFor = (main: string) => `pulse:agent:${NETWORK}:${main.toLowerCase()}`

export function loadAgent(main: string): StoredAgent | null {
  try {
    const raw = localStorage.getItem(keyFor(main))
    if (!raw) return null
    const a = JSON.parse(raw) as StoredAgent
    if (!/^0x[0-9a-f]{64}$/i.test(a.pk) || !/^0x[0-9a-f]{40}$/i.test(a.address)) return null
    // Defence in depth: the stored address must really belong to the stored key.
    if (privateKeyToAccount(a.pk).address.toLowerCase() !== a.address.toLowerCase()) return null
    return a
  } catch {
    return null
  }
}

export function saveAgent(main: string, a: StoredAgent) {
  try { localStorage.setItem(keyFor(main), JSON.stringify(a)) } catch { /* storage unavailable */ }
}

export function clearAgent(main: string) {
  try { localStorage.removeItem(keyFor(main)) } catch { /* ignore */ }
}

export function newAgent(now = Date.now()): StoredAgent {
  const pk = generatePrivateKey()
  return { pk, address: privateKeyToAccount(pk).address, name: AGENT_NAME, validUntil: now + AGENT_TTL_MS, createdAt: now }
}

/** Name string Hyperliquid parses for expiry: "<name> valid_until <ms>". */
export const agentWireName = (a: Pick<StoredAgent, 'name' | 'validUntil'>) => `${a.name} valid_until ${a.validUntil}`
