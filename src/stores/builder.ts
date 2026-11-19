import { create } from 'zustand'
import type { ExchangeClient } from '@nktkas/hyperliquid'
import { BUILDER, builderFeeToPercent } from '@/config/env'
import { info } from '@/lib/hl/clients'
import { errMsg } from '@/lib/hl/trade'

type Status = 'disabled' | 'unknown' | 'checking' | 'approved' | 'needed' | 'working'

interface BuilderStore {
  status: Status
  /** Max fee the user has approved for our builder address (tenths of a bp), if known. */
  approvedMax: number | null
  error: string | null
  check: (user: `0x${string}` | null) => Promise<void>
  approve: (mainExchange: ExchangeClient, user: `0x${string}`) => Promise<boolean>
}

export const useBuilderStore = create<BuilderStore>((set, get) => ({
  status: BUILDER ? 'unknown' : 'disabled',
  approvedMax: null,
  error: null,

  async check(user) {
    if (!BUILDER) return
    if (!user) return set({ status: 'unknown', approvedMax: null })
    set({ status: 'checking', error: null })
    try {
      const max = await info.maxBuilderFee({ user, builder: BUILDER.address })
      set({ approvedMax: max, status: max >= BUILDER.fee ? 'approved' : 'needed' })
    } catch (e) {
      set({ status: 'unknown', error: errMsg(e) })
    }
  },

  // ApproveBuilderFee is a user-signed action: it must be signed by the MAIN wallet, never an agent.
  async approve(mainExchange, user) {
    if (!BUILDER) return false
    set({ status: 'working', error: null })
    try {
      await mainExchange.approveBuilderFee({ maxFeeRate: builderFeeToPercent(BUILDER.fee), builder: BUILDER.address })
      await get().check(user)
      return get().status === 'approved'
    } catch (e) {
      set({ status: 'needed', error: errMsg(e) })
      return false
    }
  },
}))
