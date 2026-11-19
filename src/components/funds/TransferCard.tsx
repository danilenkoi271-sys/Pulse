import { useEffect, useMemo, useState } from 'react'
import { HIP3_DEXS } from '@/config/env'
import { useWalletApi } from '@/wallet/context'
import { useAccount } from '@/stores/account'
import { useMainExchange } from '@/hooks/useMainExchange'
import { info } from '@/lib/hl/clients'
import { validateTransfer } from '@/lib/funds'
import { errMsg } from '@/lib/hl/trade'
import { toast } from '@/stores/toasts'
import { fmtUsd, num } from '@/lib/format/numbers'

const nameOf = (id: string) => (id === '' ? 'Perps (main)' : id === 'spot' ? 'Spot' : `${id} (HIP-3)`)

/** Standard-mode accounts keep separate balances per venue; this moves USDC between them (main-wallet signed). */
export function TransferCard() {
  const w = useWalletApi()
  const getEx = useMainExchange()
  const { dexSummary, spot, mode } = useAccount()
  const venues = useMemo(() => ['', 'spot', ...HIP3_DEXS], [])
  const [from, setFrom] = useState('')
  const [to, setTo] = useState(HIP3_DEXS[0] ?? 'spot')
  const [amount, setAmount] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    info.spotMeta().then((m) => {
      const t = m.tokens.find((x) => x.name === 'USDC')
      if (t) setToken(`${t.name}:${t.tokenId}`)
    }).catch(() => undefined)
  }, [])

  const spotUsdc = spot.find((b) => b.coin === 'USDC')
  const avail = (v: string) => (v === 'spot' ? Math.max(0, num(spotUsdc?.total) - num(spotUsdc?.hold)) : dexSummary[v]?.withdrawable ?? 0)
  const available = avail(from)
  const error = amount ? validateTransfer(amount, available) : null

  if (mode === 'unifiedAccount' || mode === 'portfolioMargin') {
    return (
      <section className="card p-5">
        <h2 className="text-lg font-bold">Transfers</h2>
        <p className="mt-2 text-sm text-ink-300">Your account is in <b>{mode === 'unifiedAccount' ? 'unified' : 'portfolio margin'}</b> mode: one USDC balance backs spot, perps and HIP-3 markets, so no transfers are needed.</p>
      </section>
    )
  }

  const submit = async () => {
    if (!w.address || !token || validateTransfer(amount, available) || from === to) return
    setBusy(true)
    try {
      await (await getEx()).sendAsset({ destination: w.address, sourceDex: from, destinationDex: to, token, amount })
      toast.success('Transfer complete', `${amount} USDC: ${nameOf(from)} → ${nameOf(to)}`)
      setAmount('')
    } catch (e) {
      toast.error('Transfer failed', errMsg(e))
    } finally { setBusy(false) }
  }

  return (
    <section className="card p-5" aria-labelledby="tr-h">
      <h2 id="tr-h" className="text-lg font-bold">Transfer between balances</h2>
      <p className="mt-1 text-xs text-ink-300">Standard accounts keep separate balances for perps, spot and each HIP-3 dex (e.g. stocks &amp; commodities). Move USDC to where you want to trade.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div><label className="label" htmlFor="tr-from">From</label><select id="tr-from" className="input" value={from} onChange={(e) => setFrom(e.target.value)}>{venues.map((v) => <option key={v} value={v}>{nameOf(v)}</option>)}</select></div>
        <div><label className="label" htmlFor="tr-to">To</label><select id="tr-to" className="input" value={to} onChange={(e) => setTo(e.target.value)}>{venues.map((v) => <option key={v} value={v}>{nameOf(v)}</option>)}</select></div>
      </div>
      <p className="mt-2 text-xs text-ink-400">Available: <span className="font-mono text-ink-200">{fmtUsd(available)}</span></p>
      <label className="label mt-3" htmlFor="tr-amt">Amount (USDC)</label>
      <div className="flex gap-1">
        <input id="tr-amt" className="input font-mono" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.trim())} />
        <button className="btn-ghost px-3 text-xs" onClick={() => setAmount(String(Math.floor(available * 1e6) / 1e6))}>Max</button>
      </div>
      {error && <p className="mt-1 text-xs text-down">{error}</p>}
      {from === to && <p className="mt-1 text-xs text-down">Choose two different balances.</p>}
      <button className="btn-primary mt-3 w-full" disabled={!w.authenticated || !amount || !!error || from === to || !token || busy} onClick={submit}>{busy ? 'Waiting for wallet…' : 'Transfer'}</button>
    </section>
  )
}
