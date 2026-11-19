import { useEffect, useState } from 'react'
import { wsTransport } from '@/lib/hl/clients'

export type ConnState = 'connecting' | 'live' | 'down'

/** Real state of the one shared Hyperliquid WebSocket. */
export function useConnection(): ConnState {
  const [state, setState] = useState<ConnState>('connecting')
  useEffect(() => {
    const s = wsTransport().socket
    const upd = () => setState(s.readyState === 1 ? 'live' : s.readyState === 0 ? 'connecting' : 'down')
    upd()
    s.addEventListener('open', upd)
    s.addEventListener('close', upd)
    s.addEventListener('error', upd)
    return () => {
      s.removeEventListener('open', upd)
      s.removeEventListener('close', upd)
      s.removeEventListener('error', upd)
    }
  }, [])
  return state
}
