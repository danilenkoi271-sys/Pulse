import { useEffect, useMemo, useState } from 'react'
import { useWalletApi } from '@/wallet/context'
import { makeSupabase, supabaseEnabled, USERNAME_RE } from '@/lib/supabase'
import { toast } from '@/stores/toasts'

/** Optional profile (username only). Renders nothing unless Supabase is configured. */
export function ProfileCard() {
  const w = useWalletApi()
  const sb = useMemo(() => makeSupabase(w.getAccessToken), [w.getAccessToken])
  const [username, setUsername] = useState('')
  const [saved, setSaved] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!sb || !w.userId) return
    sb.from('profiles').select('username').eq('user_id', w.userId).maybeSingle().then(({ data }) => {
      setSaved(data?.username ?? null); setUsername(data?.username ?? '')
    })
  }, [sb, w.userId])

  if (!supabaseEnabled || !w.authenticated || !w.userId || !w.address) return null
  const valid = USERNAME_RE.test(username)

  const save = async () => {
    if (!sb || !valid || !w.address) return
    setBusy(true)
    const { error } = await sb.from('profiles').upsert({ user_id: w.userId, address: w.address, username, updated_at: new Date().toISOString() })
    setBusy(false)
    if (error) toast.error(error.code === '23505' ? 'Username taken' : 'Could not save profile', error.code === '23505' ? undefined : error.message)
    else { setSaved(username); toast.success('Profile saved') }
  }

  return (
    <div className="card p-4">
      <h2 className="text-sm font-semibold">Profile <span className="font-normal text-ink-400">(optional)</span></h2>
      <p className="mt-1 text-xs text-ink-400">Only a username is stored, linked to your wallet address. No keys or funds are ever stored.</p>
      <div className="mt-3 flex gap-2">
        <input className="input" aria-label="Username" placeholder="username" maxLength={20} value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} />
        <button className="btn-ghost" disabled={!valid || busy || username === saved} onClick={save}>Save</button>
      </div>
      {username && !valid && <p className="mt-1 text-xs text-down">3–20 characters: a–z, 0–9, underscore.</p>}
    </div>
  )
}
