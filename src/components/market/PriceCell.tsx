import { memo } from 'react'
import { useMarkets } from '@/stores/markets'
import { fmtPrice } from '@/lib/format/numbers'

/** Re-renders only when this market's mark price changes; flashes on tick. */
export const PriceCell = memo(function PriceCell({ mkey, className = '' }: { mkey: string; className?: string }) {
  const mark = useMarkets((s) => s.ctx[mkey]?.mark)
  const dir = useMarkets((s) => s.flash[mkey])
  return (
    <span key={`${mark}`} className={`tabular font-mono ${dir === 'up' ? 'flash-up' : dir === 'down' ? 'flash-down' : ''} ${className}`}>
      {fmtPrice(mark)}
    </span>
  )
})
