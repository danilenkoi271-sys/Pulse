import { useMemo } from 'react'
import { BUILDER } from '@/config/env'

export interface BuilderState {
  /** Configured AND approved by this user → fee will be attached to orders. */
  active: boolean
  /** Configured (env) — regardless of approval. */
  configured: boolean
  address: `0x${string}`
  /** Tenths of a basis point. */
  fee: number
}

/** Stage 4 wires approval state; until then builder fees are never attached. */
export function useBuilder() {
  const builder = useMemo<BuilderState>(
    () => ({ active: false, configured: !!BUILDER, address: BUILDER?.address ?? '0x0000000000000000000000000000000000000000', fee: BUILDER?.fee ?? 0 }),
    [],
  )
  return { builder }
}
