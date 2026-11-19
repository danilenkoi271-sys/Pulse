import { create } from 'zustand'
import { privateKeyToAccount } from 'viem/accounts'
import type { ExchangeClient } from '@nktkas/hyperliquid'
import { info } from '@/lib/hl/clients'
import { agentWireName, clearAgent, loadAgent, newAgent, saveAgent, type StoredAgent } from '@/lib/agent'
import { errMsg } from '@/lib/hl/trade'

type Status = 'none' | 'checking' | 'active' | 'working'

interface AgentState {
  main: `0x${string}` | null
  status: Status
  agent: StoredAgent | null
  error: string | null
  /** Load the locally stored agent for `main` and verify with Hyperliquid that it is still approved. */
  load: (main: `0x${string}` | null) => Promise<void>
  /** Approve a fresh agent (signed by the MAIN wallet via `mainExchange`). */
  enable: (mainExchange: ExchangeClient) => Promise<boolean>
  /** Revoke: approve a throwaway address under the same name (replaces the old agent), delete local key. */
  revoke: (mainExchange: ExchangeClient) => Promise<boolean>
  /** Forget the local key only (does not revoke on Hyperliquid). */
  forget: () => void
}

export const useAgent = create<AgentState>((set, get) => ({
  main: null,
  status: 'none',
  agent: null,
  error: null,

  async load(main) {
    set({ main, agent: null, status: 'none', error: null })
    if (!main) return
    const stored = loadAgent(main)
    if (!stored) return
    set({ status: 'checking' })
    try {
      const list = await info.extraAgents({ user: main })
      const ok = list.some((a) => a.address.toLowerCase() === stored.address.toLowerCase() && (!a.validUntil || a.validUntil > Date.now()))
      if (get().main !== main) return
      if (ok) set({ agent: stored, status: 'active' })
      else { clearAgent(main); set({ agent: null, status: 'none' }) } // revoked or expired elsewhere
    } catch {
      // Network hiccup: keep the key but don't claim it is active until verified.
      if (get().main === main) set({ agent: null, status: 'none' })
    }
  },

  async enable(mainExchange) {
    const main = get().main
    if (!main) return false
    set({ status: 'working', error: null })
    try {
      const a = newAgent()
      await mainExchange.approveAgent({ agentAddress: a.address, agentName: agentWireName(a) })
      saveAgent(main, a)
      set({ agent: a, status: 'active' })
      return true
    } catch (e) {
      set({ status: get().agent ? 'active' : 'none', error: errMsg(e) })
      return false
    }
  },

  async revoke(mainExchange) {
    const main = get().main
    const cur = get().agent
    if (!main || !cur) return false
    set({ status: 'working', error: null })
    try {
      const burner = newAgent()
      await mainExchange.approveAgent({ agentAddress: burner.address, agentName: agentWireName({ name: cur.name, validUntil: Date.now() + 60_000 }) })
      clearAgent(main)
      set({ agent: null, status: 'none' })
      return true
    } catch (e) {
      set({ status: 'active', error: errMsg(e) })
      return false
    }
  },

  forget() {
    const main = get().main
    if (main) clearAgent(main)
    set({ agent: null, status: 'none' })
  },
}))

/** viem local account for the active agent (never used for withdrawals/transfers). */
export const agentAccount = (a: StoredAgent) => privateKeyToAccount(a.pk)
