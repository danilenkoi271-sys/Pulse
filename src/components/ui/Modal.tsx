import { useEffect, type ReactNode } from 'react'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', h); document.body.style.overflow = prev }
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[60] grid place-items-end bg-void/85 sm:place-items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()} role="presentation">
      <div role="dialog" aria-modal="true" aria-label={title} className="ticks max-h-[92vh] w-full overflow-y-auto border border-line2 shadow-[0_30px_80px_rgba(0,0,0,.7)] sm:max-w-md">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="display-wide text-[15px] text-bone">{title}</h2>
          <button aria-label="Close" onClick={onClose} className="k hover:text-bone">Esc ✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
