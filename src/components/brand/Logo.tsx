import { useId } from 'react'

/** Pulse mark: a heartbeat line threaded through a rounded tile. */
export function LogoMark({ size = 32 }: { size?: number }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9a87ff" />
          <stop offset="1" stopColor="#4dd6ff" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0e121a" stroke="#262e41" />
      <path d="M8 34h13l5-14 8 28 6-20 4 6h12" fill="none" stroke={`url(#${id})`} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className="text-lg font-bold tracking-tight">Pulse</span>
    </span>
  )
}
