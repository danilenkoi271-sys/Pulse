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
import { Dropdown } from '@/components/ui/Dropdown'

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
      <section className="ticks p-5">
        <p className="k !text-lime">03</p>
        <h2 className="display mt-1 text-[34px] text-bone">Transfer</h2>
        <p className="mt-2 text-[13px] text-mute">Your account is in <b>{mode === 'unifiedAccount' ? 'unified' : 'portfolio margin'}</b> mode: one USDC balance backs spot, perps and HIP-3 markets, so no transfers are needed.</p>
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
    <section className="ticks p-5" aria-labelledby="tr-h">
      <p className="k !text-lime">03</p>
      <h2 id="tr-h" className="display mt-1 text-[34px] text-bone">Transfer</h2>
      <p className="mt-2 text-[13px] text-mute">Standard accounts keep separate USDC balances for perps, spot and each HIP-3 dex (stocks &amp; commodities). Move it to where you want to trade.</p>
      <div className="mt-5 grid grid-cols-2 gap-2">
        <div><span className="lab">From</span><Dropdown label="From" value={from} onChange={setFrom} options={venues.map((v) => ({ value: v, label: nameOf(v) }))} /></div>
        <div><span className="lab">To</span><Dropdown label="To" value={to} onChange={setTo} options={venues.map((v) => ({ value: v, label: nameOf(v) }))} /></div>
      </div>
      <p className="mt-3 k">Available <span className="num text-bone">{fmtUsd(available)}</span></p>
      <label className="lab mt-4" htmlFor="tr-amt">Amount · USDC</label>
      <div className="flex gap-1">
        <input id="tr-amt" className="field" inputMode="decimal" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value.trim())} />
        <button className="btn" onClick={() => setAmount(String(Math.floor(available * 1e6) / 1e6))}>Max</button>
      </div>
      {error && <p className="mt-1.5 text-[12px] text-down">{error}</p>}
      {from === to && <p className="mt-1.5 text-[12px] text-down">Choose two different balances.</p>}
      <button className="btn-lime mt-4 h-11 w-full" disabled={!w.authenticated || !amount || !!error || from === to || !token || busy} onClick={submit}>{busy ? 'Check wallet…' : 'Transfer'}</button>
    </section>
  )
}
