import { useId, useState, type ReactNode } from 'react'

/** Accessible hover / focus / tap tooltip. */
export function Tooltip({ text, children }: { text: ReactNode; children: ReactNode }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}>
      <span aria-describedby={open ? id : undefined} onClick={() => setOpen((o) => !o)}>{children}</span>
      {open && (
        <span id={id} role="tooltip" className="absolute bottom-full left-1/2 z-50 mb-2 w-60 -translate-x-1/2 border border-line2 bg-raise p-2.5 text-left font-sans text-[12px] font-normal normal-case leading-relaxed tracking-normal text-text shadow-[0_12px_30px_rgba(0,0,0,.6)]">
          {text}
        </span>
      )}
    </span>
  )
}

/** "?" marker that explains a term in plain English. */
export function Help({ text }: { text: ReactNode }) {
  return (
    <Tooltip text={text}>
      <button type="button" aria-label="Explain" className="inline-grid h-[14px] w-[14px] place-items-center border border-line2 font-mono text-[9px] font-bold leading-none text-mute hover:border-lime hover:text-lime">?</button>
    </Tooltip>
  )
}

export const HELP = {
  leverage: 'Leverage lets you hold a bigger position than your margin. At 5x, a 1% price move changes your margin by 5%. More leverage means your liquidation price sits closer to your entry.',
  funding: 'Funding is a small hourly payment between longs and shorts that keeps the perp price near spot. Positive: longs pay shorts. Negative: shorts pay longs.',
  liquidation: 'If price reaches your liquidation price, the exchange closes your position and the margin in it is gone. Lower leverage pushes it further away.',
  cross: 'Cross: your whole free balance backs every cross position (bigger buffer, shared risk). Isolated: only the margin assigned to this position is at risk.',
  reduceOnly: 'A reduce-only order can only shrink or close a position. It can never open or flip one. Good for exits.',
  tpsl: 'Take-profit closes the position at a better price to lock a gain. Stop-loss closes it at a worse price to cap a loss. Both trigger on their own.',
  postOnly: 'Post-only orders only add liquidity. If one would fill instantly it is rejected, so you always pay the lower maker fee.',
  slippage: 'Market orders go out as aggressive limit orders. Slippage is the worst price you will accept versus the current one; anything unfilled is cancelled.',
  oi: 'Open interest is the total value of all open positions in this market.',
} as const
