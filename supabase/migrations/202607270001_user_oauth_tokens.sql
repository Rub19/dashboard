begin;

-- OAuth access/refresh tokens obtained on the user's behalf (e.g. Spotify
-- Authorization Code with PKCE). Strictly more sensitive than a personal API
-- key: unlike user_provider_credentials, this table grants no direct client
-- access at all. Only the ETHONE Worker (service_role) may read or write it.
create table if not exists public.user_oauth_tokens (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('spotify')),
  access_token text not null check (char_length(access_token) between 8 and 4000),
  refresh_token text not null check (char_length(refresh_token) between 8 and 4000),
  scope text not null default '' check (char_length(scope) <= 500),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_oauth_tokens_owner_provider_idx
  on public.user_oauth_tokens (owner_id, provider);

alter table public.user_oauth_tokens enable row level security;
alter table public.user_oauth_tokens force row level security;

drop policy if exists user_oauth_tokens_no_client_access on public.user_oauth_tokens;

revoke all on public.user_oauth_tokens from public;
revoke all on public.user_oauth_tokens from anon;
revoke all on public.user_oauth_tokens from authenticated;

-- Server-only read used by the Worker (service_role) to fetch a specific
-- user's stored OAuth token when proxying an API call or refreshing it.
create or replace function public.get_oauth_token(requested_user_id uuid, requested_provider text)
returns table (access_token text, refresh_token text, scope text, expires_at timestamptz)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select access_token, refresh_token, scope, expires_at
  from public.user_oauth_tokens
  where owner_id = requested_user_id
    and provider = requested_provider
  limit 1
$$;

revoke all on function public.get_oauth_token(uuid, text) from public;
revoke all on function public.get_oauth_token(uuid, text) from anon;
revoke all on function public.get_oauth_token(uuid, text) from authenticated;
grant execute on function public.get_oauth_token(uuid, text) to service_role;

-- Server-only upsert used by the Worker after a successful token exchange
-- or refresh. Never reachable from the browser.
create or replace function public.set_oauth_token(requested_user_id uuid, requested_provider text, next_access_token text, next_refresh_token text, next_scope text, next_expires_at timestamptz)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  insert into public.user_oauth_tokens (owner_id, provider, access_token, refresh_token, scope, expires_at, updated_at)
  values (requested_user_id, requested_provider, next_access_token, next_refresh_token, next_scope, next_expires_at, now())
  on conflict (owner_id, provider) do update
    set access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        scope = excluded.scope,
        expires_at = excluded.expires_at,
        updated_at = now()
$$;

revoke all on function public.set_oauth_token(uuid, text, text, text, text, timestamptz) from public;
revoke all on function public.set_oauth_token(uuid, text, text, text, text, timestamptz) from anon;
revoke all on function public.set_oauth_token(uuid, text, text, text, text, timestamptz) from authenticated;
grant execute on function public.set_oauth_token(uuid, text, text, text, text, timestamptz) to service_role;

-- Server-only delete used when a user disconnects Spotify.
create or replace function public.delete_oauth_token(requested_user_id uuid, requested_provider text)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  delete from public.user_oauth_tokens
  where owner_id = requested_user_id
    and provider = requested_provider
$$;

revoke all on function public.delete_oauth_token(uuid, text) from public;
revoke all on function public.delete_oauth_token(uuid, text) from anon;
revoke all on function public.delete_oauth_token(uuid, text) from authenticated;
grant execute on function public.delete_oauth_token(uuid, text) to service_role;

commit;
