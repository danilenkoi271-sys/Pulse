import { useEffect } from 'react'
import { useWalletApi } from '@/wallet/context'
import { useAccount } from '@/stores/account'
import { useAgent } from '@/stores/agent'

/**
 * Starts/stops the live account subscriptions when the connected wallet changes.
 * In dev builds only, `?viewAs=0x…` previews any public address read-only (handy for testing).
 */
export function AccountSync() {
  const { address, authenticated } = useWalletApi()
  const start = useAccount((s) => s.start)
  const stop = useAccount((s) => s.stop)

  useEffect(() => {
    let target: `0x${string}` | null = authenticated ? address : null
    if (import.meta.env.DEV && !target) {
      const v = new URLSearchParams(window.location.search).get('viewAs')
      if (v && /^0x[a-fA-F0-9]{40}$/.test(v)) target = v.toLowerCase() as `0x${string}`
    }
    if (target) start(target)
    else stop()
    // Only a real (authenticated) wallet may use a stored agent key.
    void useAgent.getState().load(authenticated ? address : null)
    return () => stop()
  }, [address, authenticated, start, stop])

  return null
}
