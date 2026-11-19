import type { ReactNode } from 'react'

/** Square on/off switch. */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-[12px] text-text">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={`relative h-[16px] w-[30px] shrink-0 border transition-colors ${checked ? 'border-lime bg-lime/15' : 'border-line2 bg-void'} focus-visible:outline focus-visible:outline-1 focus-visible:outline-lime`}>
        <span className={`absolute top-[2px] h-[10px] w-[10px] transition-all ${checked ? 'left-[16px] bg-lime' : 'left-[2px] bg-dim'}`} />
      </button>
      <span className="flex items-center gap-1.5">{label}</span>
    </label>
  )
}

export function Segmented<T extends string>({ value, options, onChange, label, className = '' }: { value: T; options: { value: T; label: ReactNode; disabled?: boolean }[]; onChange: (v: T) => void; label: string; className?: string }) {
  return (
    <div className={`seg ${className}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" disabled={o.disabled} aria-pressed={o.value === value} onClick={() => onChange(o.value)} className={`flex-1 disabled:opacity-40 ${o.disabled ? 'cursor-not-allowed' : ''}`}>{o.label}</button>
      ))}
    </div>
  )
}
