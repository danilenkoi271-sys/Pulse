import { useEffect, useState } from 'react'
import { GEOBLOCK_COUNTRIES, GEOBLOCK_FAIL_CLOSED } from '@/config/env'

export interface GeoState {
  loading: boolean
  country: string | null
  blocked: boolean
}

/**
 * Looks up the visitor's country from the `/api/geo` edge function (a header echo; no user data)
 * and compares it with VITE_GEOBLOCK_COUNTRIES. This is a UX-level gate, NOT a legal guarantee —
 * what you block, and whether it is sufficient, is a decision for you and your counsel.
 */
export function useGeoblock(): GeoState {
  const enabled = GEOBLOCK_COUNTRIES.length > 0 || GEOBLOCK_FAIL_CLOSED
  const [state, setState] = useState<GeoState>({ loading: enabled, country: null, blocked: false })

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    fetch('/api/geo')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { country: string | null }) => {
        if (cancelled) return
        const country = j.country
        const blocked = country ? GEOBLOCK_COUNTRIES.includes(country) : GEOBLOCK_FAIL_CLOSED
        setState({ loading: false, country, blocked })
      })
      .catch(() => !cancelled && setState({ loading: false, country: null, blocked: GEOBLOCK_FAIL_CLOSED }))
    return () => {
      cancelled = true
    }
  }, [enabled])

  return state
}
