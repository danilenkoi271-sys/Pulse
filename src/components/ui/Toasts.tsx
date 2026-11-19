import { useToasts } from '@/stores/toasts'

const bar = { error: 'bg-down', success: 'bg-up', info: 'bg-lime' } as const

export function Toasts() {
  const { toasts, dismiss } = useToasts()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-3 md:bottom-12 md:items-end md:pr-5" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} role="status" className="pointer-events-auto flex w-full max-w-sm animate-rise border border-line2 bg-raise shadow-[0_16px_40px_rgba(0,0,0,.6)]">
          <span className={`w-1 shrink-0 ${bar[t.kind]}`} />
          <div className="flex flex-1 items-start justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="k !text-bone">{t.title}</p>
              {t.body && <p className="mt-1 break-words text-[12px] text-mute">{t.body}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="k hover:text-bone">✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}
