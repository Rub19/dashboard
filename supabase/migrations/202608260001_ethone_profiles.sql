begin;

create table if not exists public.ethone_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null default 'personal',
  accent text not null default 'violet',
  widgets jsonb not null default '[]'::jsonb,
  integrations jsonb not null default '[]'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_profiles_name_length check (char_length(name) between 1 and 120),
  constraint ethone_profiles_type check (type in ('personal', 'work', 'development', 'study', 'gaming', 'streaming', 'creative')),
  constraint ethone_profiles_accent_length check (char_length(accent) <= 32)
);

create unique index if not exists ethone_profiles_active_user_idx
  on public.ethone_profiles (user_id)
  where is_active = true;

create index if not exists ethone_profiles_user_id_idx
  on public.ethone_profiles (user_id);

alter table public.ethone_profiles enable row level security;
alter table public.ethone_profiles force row level security;

drop policy if exists ethone_profiles_owner_select on public.ethone_profiles;
drop policy if exists ethone_profiles_owner_insert on public.ethone_profiles;
drop policy if exists ethone_profiles_owner_update on public.ethone_profiles;
drop policy if exists ethone_profiles_owner_delete on public.ethone_profiles;

create policy ethone_profiles_owner_select
  on public.ethone_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_profiles_owner_insert
  on public.ethone_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_profiles_owner_update
  on public.ethone_profiles for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ethone_profiles_owner_delete
  on public.ethone_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ethone_profiles from public;
revoke all on public.ethone_profiles from anon;
revoke truncate, references, trigger on public.ethone_profiles from authenticated;
grant select, insert, update, delete on public.ethone_profiles to authenticated;

-- Helper to maintain a single active profile per user.
create or replace function public.ethone_set_active_profile(profile_id uuid)
returns public.ethone_profiles
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result public.ethone_profiles;
  target_user_id uuid;
begin
  select user_id into target_user_id
  from public.ethone_profiles
  where id = profile_id;

  if target_user_id is null or target_user_id <> (select auth.uid()) then
    raise exception 'Profile not found';
  end if;

  update public.ethone_profiles
  set is_active = false
  where user_id = target_user_id;

  update public.ethone_profiles
  set is_active = true, updated_at = now()
  where id = profile_id
  returning * into result;

  return result;
end;
$$;

revoke all on function public.ethone_set_active_profile(uuid) from public;
revoke all on function public.ethone_set_active_profile(uuid) from anon;
revoke all on function public.ethone_set_active_profile(uuid) from authenticated;
grant execute on function public.ethone_set_active_profile(uuid) to authenticated;

commit;
