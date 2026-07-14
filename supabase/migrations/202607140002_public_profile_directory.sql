begin;

create table if not exists public.ethone_public_profiles (
  public_id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  username text not null,
  display_name text not null default '',
  avatar_url text not null default '',
  discoverable boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint ethone_public_profiles_username_format check (
    username = lower(username)
    and username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'
  ),
  constraint ethone_public_profiles_display_name_length check (char_length(display_name) <= 80),
  constraint ethone_public_profiles_avatar_url check (
    avatar_url = ''
    or (
      char_length(avatar_url) <= 1200
      and avatar_url ~ '^https://[^[:space:]<>]+$'
    )
  )
);

create unique index if not exists ethone_public_profiles_username_idx
  on public.ethone_public_profiles (username);

alter table public.ethone_public_profiles enable row level security;
alter table public.ethone_public_profiles force row level security;

drop policy if exists ethone_public_profiles_owner_select on public.ethone_public_profiles;
drop policy if exists ethone_public_profiles_owner_insert on public.ethone_public_profiles;
drop policy if exists ethone_public_profiles_owner_update on public.ethone_public_profiles;
drop policy if exists ethone_public_profiles_owner_delete on public.ethone_public_profiles;

create policy ethone_public_profiles_owner_select
  on public.ethone_public_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_public_profiles_owner_insert
  on public.ethone_public_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_public_profiles_owner_update
  on public.ethone_public_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ethone_public_profiles_owner_delete
  on public.ethone_public_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ethone_public_profiles from public;
revoke all on public.ethone_public_profiles from anon;
revoke truncate, references, trigger on public.ethone_public_profiles from authenticated;
grant select, insert, update, delete on public.ethone_public_profiles to authenticated;

create or replace function public.find_ethone_public_profile(requested_username text)
returns table (
  public_id uuid,
  username text,
  display_name text,
  avatar_url text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    directory.public_id,
    directory.username,
    directory.display_name,
    directory.avatar_url
  from public.ethone_public_profiles as directory
  where directory.discoverable = true
    and char_length(btrim(requested_username)) between 3 and 32
    and lower(btrim(requested_username)) ~ '^[a-z0-9][a-z0-9._-]{2,31}$'
    and directory.username = lower(btrim(requested_username))
  limit 1
$$;

revoke all on function public.find_ethone_public_profile(text) from public;
revoke all on function public.find_ethone_public_profile(text) from anon;
revoke all on function public.find_ethone_public_profile(text) from authenticated;
grant execute on function public.find_ethone_public_profile(text) to service_role;

commit;
