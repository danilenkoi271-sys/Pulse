import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/config/env'

export const supabaseEnabled = !!SUPABASE_URL && !!SUPABASE_ANON_KEY

/** Client that authenticates with the user's Privy access token (never stores keys or funds). */
export function makeSupabase(getToken: () => Promise<string | null>): SupabaseClient | null {
  if (!supabaseEnabled) return null
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    accessToken: async () => (await getToken()) ?? '',
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/
export interface Profile { username: string | null; settings: Record<string, unknown> }
