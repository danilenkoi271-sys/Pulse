-- Pulse: optional user profiles. NO keys, balances or trading data are stored here.
-- Rows are owned by the authenticated Privy user (JWT "sub"); the wallet address is informational.
-- Requires Privy to be configured as a Third-Party Auth / Custom OIDC provider in Supabase so that
-- `auth.jwt()` carries the Privy token. Without that, leave VITE_SUPABASE_* unset (feature stays off).

create table if not exists public.profiles (
  user_id     text primary key,                     -- Privy user id (JWT sub)
  address     text not null check (address ~ '^0x[0-9a-fA-F]{40}$'),
  username    text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  settings    jsonb not null default '{}'::jsonb check (jsonb_typeof(settings) = 'object' and pg_column_size(settings) < 4096),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile: select" on public.profiles for select to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id);
create policy "own profile: insert" on public.profiles for insert to authenticated
  with check ((select auth.jwt() ->> 'sub') = user_id);
create policy "own profile: update" on public.profiles for update to authenticated
  using ((select auth.jwt() ->> 'sub') = user_id)
  with check ((select auth.jwt() ->> 'sub') = user_id);
-- Intentionally no delete policy and no anonymous access.
