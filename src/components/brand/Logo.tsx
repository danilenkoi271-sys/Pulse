/** Pulse mark: a ring cut open by a heartbeat trace. */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" fill="none">
      <circle cx="32" cy="32" r="21" stroke="#f5f0e2" strokeWidth="5" />
      <path d="M1 33H21L27 17L36 49L42 33H63" stroke="#0a0a08" strokeWidth="11" strokeLinejoin="miter" />
      <path d="M1 33H21L27 17L36 49L42 33H63" stroke="#d6ff3d" strokeWidth="5" strokeLinejoin="miter" />
    </svg>
  )
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="display-wide text-[17px] leading-none tracking-[0.02em] text-bone" style={{ fontVariationSettings: "'wdth' 112, 'wght' 800" }}>PULSE</span>
    </span>
  )
}

/** Looping heartbeat used as a loader. */
export function PulseLine({ className = 'h-5 w-12' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 20" fill="none" aria-hidden="true">
      <path d="M0 11H14L18 3L24 18L28 11H48" stroke="#d6ff3d" strokeWidth="1.6" strokeLinejoin="miter" strokeDasharray="70" strokeDashoffset="70">
        <animate attributeName="stroke-dashoffset" from="70" to="-70" dur="1.4s" repeatCount="indefinite" />
      </path>
    </svg>
  )
}
