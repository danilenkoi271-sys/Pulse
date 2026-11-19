import { PulseLine } from '@/components/brand/Logo'

export function Spinner({ className = '' }: { className?: string }) {
  return <span className={`inline-flex ${className}`} role="status" aria-label="Loading"><PulseLine className="h-4 w-10" /></span>
}
