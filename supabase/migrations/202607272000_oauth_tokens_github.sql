begin;

-- GitHub's classic OAuth App tokens do not expire and issue no refresh
-- token, unlike Spotify's. Widen the table to support providers with
-- non-expiring, non-refreshable tokens.
alter table public.user_oauth_tokens alter column refresh_token drop not null;
alter table public.user_oauth_tokens alter column expires_at drop not null;

alter table public.user_oauth_tokens drop constraint if exists user_oauth_tokens_provider_check;
alter table public.user_oauth_tokens add constraint user_oauth_tokens_provider_check
  check (provider in ('spotify', 'github'));

create or replace function public.set_oauth_token(requested_user_id uuid, requested_provider text, next_access_token text, next_refresh_token text, next_scope text, next_expires_at timestamptz)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  insert into public.user_oauth_tokens (owner_id, provider, access_token, refresh_token, scope, expires_at, updated_at)
  values (requested_user_id, requested_provider, next_access_token, nullif(next_refresh_token, ''), next_scope, next_expires_at, now())
  on conflict (owner_id, provider) do update
    set access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        scope = excluded.scope,
        expires_at = excluded.expires_at,
        updated_at = now()
$$;

commit;
