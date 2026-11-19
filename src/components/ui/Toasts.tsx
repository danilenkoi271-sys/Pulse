import { useToasts } from '@/stores/toasts'

export function Toasts() {
  const { toasts, dismiss } = useToasts()
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[70] flex flex-col items-center gap-2 px-3 md:bottom-6 md:items-end md:pr-6" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} role="status" className={`pointer-events-auto w-full max-w-sm rounded-xl border p-3 text-sm shadow-xl ${t.kind === 'error' ? 'border-down/50 bg-ink-850' : t.kind === 'success' ? 'border-up/40 bg-ink-850' : 'border-ink-600 bg-ink-850'}`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`font-semibold ${t.kind === 'error' ? 'text-down' : t.kind === 'success' ? 'text-up' : 'text-ink-100'}`}>{t.title}</p>
              {t.body && <p className="mt-0.5 break-words text-xs text-ink-300">{t.body}</p>}
            </div>
            <button onClick={() => dismiss(t.id)} aria-label="Dismiss" className="text-ink-400 hover:text-white">✕</button>
          </div>
        </div>
      ))}
    </div>
  )
}
