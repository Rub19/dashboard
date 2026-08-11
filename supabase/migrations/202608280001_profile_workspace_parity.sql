begin;

-- Add workspace to profiles first (needed for the backfill below).
alter table public.ethone_profiles
  add column if not exists workspace_id text not null default 'personal';

alter table public.ethone_profiles
  add constraint ethone_profiles_workspace_check
  check (workspace_id in ('personal', 'focus', 'studio'));

create index if not exists ethone_profiles_workspace_id_idx on public.ethone_profiles (workspace_id);

-- Add profile/workspace scoping to ethone_user_data.
alter table public.ethone_user_data
  add column if not exists profile_id uuid,
  add column if not exists workspace_id text not null default '';

-- Backfill workspace_id from the linked profile so existing records are consistent.
update public.ethone_user_data d
set workspace_id = coalesce(p.workspace_id, '')
from public.ethone_profiles p
where d.profile_id = p.id;

alter table public.ethone_user_data
  add constraint ethone_user_data_profile_fk
  foreign key (profile_id) references public.ethone_profiles(id) on delete set null;

create index if not exists ethone_user_data_profile_id_idx on public.ethone_user_data (profile_id);
create index if not exists ethone_user_data_workspace_id_idx on public.ethone_user_data (workspace_id);

-- Add an active profile shortcut to ethone_user_state for quick lookups.
alter table public.ethone_user_state
  add column if not exists active_profile_id uuid,
  add constraint ethone_user_state_active_profile_fk
  foreign key (active_profile_id) references public.ethone_profiles(id) on delete set null;

create index if not exists ethone_user_state_active_profile_id_idx on public.ethone_user_state (active_profile_id);

-- Keep ethone_user_state.active_profile_id in sync with the active profile flag.
create or replace function public.sync_ethone_user_state_active_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.is_active = true then
    insert into public.ethone_user_state (user_id, active_profile_id, payload)
    values (new.user_id, new.id, '{}'::jsonb)
    on conflict (user_id) do update
    set active_profile_id = new.id;
  elsif old.is_active = true and new.is_active = false then
    update public.ethone_user_state
    set active_profile_id = null
    where user_id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists ethone_profiles_active_sync on public.ethone_profiles;
create trigger ethone_profiles_active_sync
  after insert or update of is_active on public.ethone_profiles
  for each row
  execute function public.sync_ethone_user_state_active_profile();

commit;
