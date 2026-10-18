begin;

create table if not exists public.ethone_valorant_personal_cache (
  user_id uuid not null references auth.users(id) on delete cascade,
  account_name text not null,
  account_tag text not null,
  cache_key text not null,
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, account_name, account_tag, cache_key),
  constraint ethone_valorant_personal_cache_payload_object
    check (jsonb_typeof(payload) in ('object', 'array')),
  constraint ethone_valorant_personal_cache_key_length
    check (char_length(cache_key) between 1 and 64),
  constraint ethone_valorant_personal_cache_account_name_length
    check (char_length(account_name) between 1 and 32),
  constraint ethone_valorant_personal_cache_account_tag_length
    check (char_length(account_tag) between 1 and 10)
);

comment on table public.ethone_valorant_personal_cache is
  'Per-user cache for Valorant personal/API-backed data; public catalogs stay on valorant-api.com.';

alter table public.ethone_valorant_personal_cache enable row level security;
alter table public.ethone_valorant_personal_cache force row level security;

drop policy if exists ethone_valorant_personal_cache_owner_select on public.ethone_valorant_personal_cache;
drop policy if exists ethone_valorant_personal_cache_owner_insert on public.ethone_valorant_personal_cache;
drop policy if exists ethone_valorant_personal_cache_owner_update on public.ethone_valorant_personal_cache;
drop policy if exists ethone_valorant_personal_cache_owner_delete on public.ethone_valorant_personal_cache;

create policy ethone_valorant_personal_cache_owner_select
  on public.ethone_valorant_personal_cache for select to authenticated
  using (user_id = (select auth.uid()));

create policy ethone_valorant_personal_cache_owner_insert
  on public.ethone_valorant_personal_cache for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy ethone_valorant_personal_cache_owner_update
  on public.ethone_valorant_personal_cache for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy ethone_valorant_personal_cache_owner_delete
  on public.ethone_valorant_personal_cache for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.ethone_valorant_personal_cache from anon;
revoke truncate, references, trigger on public.ethone_valorant_personal_cache from authenticated;
grant select, insert, update, delete on public.ethone_valorant_personal_cache to authenticated;

commit;
