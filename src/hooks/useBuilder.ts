import { useMemo } from 'react'
import { BUILDER } from '@/config/env'
import { useBuilderStore } from '@/stores/builder'

export interface BuilderState {
  /** Configured (env) AND approved by this user → the fee is attached to orders. */
  active: boolean
  /** Configured via env, regardless of approval. */
  configured: boolean
  /** Configured but the user has not approved yet — trading is gated on approval. */
  needsApproval: boolean
  checking: boolean
  address: `0x${string}`
  /** Tenths of a basis point (1 = 0.001%). */
  fee: number
}

const ZERO = '0x0000000000000000000000000000000000000000' as const

/** With no builder configured, `active` is always false and orders carry no `builder` field. */
export function useBuilder() {
  const status = useBuilderStore((s) => s.status)
  const builder = useMemo<BuilderState>(
    () => ({
      configured: !!BUILDER,
      active: !!BUILDER && status === 'approved',
      needsApproval: !!BUILDER && status === 'needed',
      checking: !!BUILDER && (status === 'checking' || status === 'unknown'),
      address: BUILDER?.address ?? ZERO,
      fee: BUILDER?.fee ?? 0,
    }),
    [status],
  )
  return { builder }
}
