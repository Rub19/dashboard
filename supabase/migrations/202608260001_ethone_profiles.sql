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

commit;
