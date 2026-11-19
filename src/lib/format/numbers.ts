export const num = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

/** Price with sensible precision for any magnitude (BTC 63,000 … memecoin 0.00001234). */
export function fmtPrice(p: number | null | undefined, maxDecimals?: number): string {
  if (p === null || p === undefined || !Number.isFinite(p)) return '—'
  if (p === 0) return '0'
  const abs = Math.abs(p)
  let d = abs >= 10000 ? 1 : abs >= 1000 ? 2 : abs >= 100 ? 3 : abs >= 10 ? 4 : abs >= 1 ? 4 : abs >= 0.01 ? 5 : 6
  if (maxDecimals !== undefined) d = Math.min(d, maxDecimals)
  return p.toLocaleString('en-US', { minimumFractionDigits: Math.min(d, 2), maximumFractionDigits: d })
}

export function fmtUsd(v: number | null | undefined, opts: { compact?: boolean; sign?: boolean } = {}): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  const s = opts.sign && v > 0 ? '+' : ''
  if (opts.compact) {
    return s + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(v)
  }
  return s + v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

export function fmtPct(v: number | null | undefined, digits = 2, sign = true): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—'
  return `${sign && v > 0 ? '+' : ''}${v.toFixed(digits)}%`
}

export function fmtSize(v: number, decimals = 4): string {
  if (!Number.isFinite(v)) return '—'
  return v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

export const shortAddr = (a?: string | null) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '')

export const pctChange = (now: number, prev: number) => (prev > 0 ? ((now - prev) / prev) * 100 : 0)
export const fundingAnnualPct = (hourly: number) => hourly * 24 * 365 * 100
export const fundingHourlyPct = (hourly: number) => hourly * 100
