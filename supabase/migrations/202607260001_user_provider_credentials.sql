begin;

create table if not exists public.user_provider_credentials (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('steam', 'twitch', 'lastfm', 'henrik', 'tracker', 'riot')),
  credential jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_provider_credentials_shape check (
    case provider
      when 'twitch' then (
        credential ? 'clientId' and credential ? 'clientSecret'
        and char_length(credential ->> 'clientId') between 4 and 128
        and char_length(credential ->> 'clientSecret') between 4 and 128
      )
      when 'riot' then (
        (
          credential ? 'henrikApiKey'
          and char_length(credential ->> 'henrikApiKey') between 4 and 200
        )
        or
        (
          credential ? 'riotApiKey'
          and char_length(credential ->> 'riotApiKey') between 4 and 200
        )
      )
      else (
        credential ? 'apiKey'
        and char_length(credential ->> 'apiKey') between 4 and 200
      )
    end
  )
);

create unique index if not exists user_provider_credentials_owner_provider_idx
  on public.user_provider_credentials (owner_id, provider);

alter table public.user_provider_credentials enable row level security;
alter table public.user_provider_credentials force row level security;

drop policy if exists user_provider_credentials_owner_select on public.user_provider_credentials;
drop policy if exists user_provider_credentials_owner_insert on public.user_provider_credentials;
drop policy if exists user_provider_credentials_owner_update on public.user_provider_credentials;
drop policy if exists user_provider_credentials_owner_delete on public.user_provider_credentials;

create policy user_provider_credentials_owner_select
  on public.user_provider_credentials for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy user_provider_credentials_owner_insert
  on public.user_provider_credentials for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy user_provider_credentials_owner_update
  on public.user_provider_credentials for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy user_provider_credentials_owner_delete
  on public.user_provider_credentials for delete to authenticated
  using ((select auth.uid()) = owner_id);

revoke all on public.user_provider_credentials from public;
revoke all on public.user_provider_credentials from anon;
revoke truncate, references, trigger on public.user_provider_credentials from authenticated;
grant select, insert, update, delete on public.user_provider_credentials to authenticated;

-- Server-only lookup used by ETHONE Worker (service_role) to fetch a specific
-- user's own provider credential when proxying an external API call on their
-- behalf. Never reachable from the browser: anon/authenticated execute is revoked.
create or replace function public.get_provider_credential(requested_user_id uuid, requested_provider text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select credential
  from public.user_provider_credentials
  where owner_id = requested_user_id
    and provider = requested_provider
  limit 1
$$;

revoke all on function public.get_provider_credential(uuid, text) from public;
revoke all on function public.get_provider_credential(uuid, text) from anon;
revoke all on function public.get_provider_credential(uuid, text) from authenticated;
grant execute on function public.get_provider_credential(uuid, text) to service_role;

commit;
