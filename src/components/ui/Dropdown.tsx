import { useEffect, useId, useRef, useState, type ReactNode } from 'react'

export interface Option<T extends string | number> { value: T; label: ReactNode; hint?: string }

/** Custom select: keyboard accessible listbox (no native <select>). */
export function Dropdown<T extends string | number>({ value, options, onChange, label, className = '', align = 'left', compact = false }: {
  value: T; options: Option<T>[]; onChange: (v: T) => void; label: string; className?: string; align?: 'left' | 'right'; compact?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  const current = options.find((o) => o.value === value)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false)
    window.addEventListener('mousedown', away)
    return () => window.removeEventListener('mousedown', away)
  }, [open])

  const key = (e: React.KeyboardEvent) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setActive(Math.max(0, options.findIndex((o) => o.value === value))); return setOpen(true) }
    if (!open) return
    if (e.key === 'Escape') setOpen(false)
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); onChange(options[active].value); setOpen(false) }
  }

  return (
    <div ref={ref} className={`relative ${className}`} onKeyDown={key}>
      <button type="button" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className={`field flex items-center justify-between gap-2 text-left ${compact ? '!h-6 !px-2 !text-[10px] uppercase tracking-caps' : ''}`}>
        <span className="truncate">{current?.label ?? '—'}</span>
        <span aria-hidden className={`text-[8px] text-dim transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && (
        <ul id={id} role="listbox" className={`absolute z-50 mt-1 max-h-64 min-w-full overflow-auto border border-line2 bg-raise shadow-[0_16px_40px_rgba(0,0,0,.6)] ${align === 'right' ? 'right-0' : 'left-0'}`}>
          {options.map((o, i) => (
            <li key={String(o.value)} role="option" aria-selected={o.value === value} onMouseEnter={() => setActive(i)} onClick={() => { onChange(o.value); setOpen(false) }}
              className={`flex cursor-pointer items-center justify-between gap-4 whitespace-nowrap border-l-2 px-3 py-2 font-mono text-[12px] ${i === active ? 'border-lime bg-line text-bone' : 'border-transparent text-mute'}`}>
              <span>{o.label}</span>{o.hint && <span className="text-[10px] text-dim">{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
