import { useId, useState, type ReactNode } from 'react'

/** Accessible hover/focus/tap tooltip. */
export function Tooltip({ text, children }: { text: ReactNode; children: ReactNode }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <span aria-describedby={open ? id : undefined} onClick={() => setOpen((o) => !o)}>{children}</span>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 rounded-lg border border-ink-600 bg-ink-800 p-2.5 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-100 shadow-xl"
        >
          {text}
        </span>
      )}
    </span>
  )
}

/** Small (i) icon with a plain-English explanation — used for beginner help. */
export function Help({ text }: { text: ReactNode }) {
  return (
    <Tooltip text={text}>
      <button type="button" aria-label="More info" className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-ink-500 text-[10px] font-bold leading-none text-ink-300 hover:border-pulse-400 hover:text-pulse-300">
        i
      </button>
    </Tooltip>
  )
}

export const HELP = {
  leverage: 'Leverage lets you control a bigger position than your margin. 5x means a 1% price move changes your margin by 5%. Higher leverage = closer liquidation price.',
  funding: 'Funding is a small hourly payment between longs and shorts that keeps the perp price near the spot price. Positive: longs pay shorts. Negative: shorts pay longs.',
  liquidation: 'If price reaches your liquidation price, Hyperliquid closes your position to protect the exchange and you lose the margin in it. Lower leverage moves it further away.',
  cross: 'Cross: all your free balance backs every cross position (more buffer, more risk shared). Isolated: only the margin you assign to this position is at risk.',
  reduceOnly: 'Reduce-only orders can only shrink or close an existing position — they can never open or flip one. Useful for exits.',
  tpsl: 'Take-profit closes your position at a better price to lock gains. Stop-loss closes it at a worse price to cap your loss. They trigger automatically.',
  postOnly: 'Post-only (ALO) orders only ever add liquidity to the book. If they would fill immediately they are rejected, so you always pay maker fees.',
  slippage: 'Market orders are sent as aggressive limit orders. Slippage is the worst price you accept versus the current price; unfilled size is cancelled.',
  oi: 'Open interest is the total value of all open positions in this market.',
} as const
