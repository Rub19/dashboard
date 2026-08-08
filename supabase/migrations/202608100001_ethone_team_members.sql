begin;

-- Team members for ETHONE Cloud collaboration.
create table if not exists public.ethone_team_members (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('owner','admin','senior','junior','assistant','viewer')),
  status text not null default 'pending' check (status in ('pending','active','declined','revoked')),
  display_name text not null default '',
  avatar_url text not null default '',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint ethone_team_members_email_format check (email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint ethone_team_members_owner_email_unique unique (owner_id, email)
);

create index if not exists ethone_team_members_owner_idx on public.ethone_team_members (owner_id);
create index if not exists ethone_team_members_status_idx on public.ethone_team_members (status);

-- Track shared file access per member.
create table if not exists public.ethone_file_collaborators (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.ethone_files(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  team_member_id uuid references public.ethone_team_members(id) on delete cascade,
  role text not null default 'viewer' check (role in ('owner','editor','viewer')),
  added_at timestamptz not null default now(),
  constraint ethone_file_collaborators_target_check check (
    (user_id is not null and team_member_id is null) or
    (user_id is null and team_member_id is not null)
  )
);

create index if not exists ethone_file_collaborators_file_idx on public.ethone_file_collaborators (file_id);
create index if not exists ethone_file_collaborators_user_idx on public.ethone_file_collaborators (user_id);
create index if not exists ethone_file_collaborators_team_idx on public.ethone_file_collaborators (team_member_id);

alter table public.ethone_team_members enable row level security;
alter table public.ethone_team_members force row level security;
alter table public.ethone_file_collaborators enable row level security;
alter table public.ethone_file_collaborators force row level security;

-- Team members policies
drop policy if exists ethone_team_members_owner_select on public.ethone_team_members;
drop policy if exists ethone_team_members_owner_insert on public.ethone_team_members;
drop policy if exists ethone_team_members_owner_update on public.ethone_team_members;
drop policy if exists ethone_team_members_owner_delete on public.ethone_team_members;

create policy ethone_team_members_owner_select
  on public.ethone_team_members for select to authenticated
  using ((select auth.uid()) = owner_id);

create policy ethone_team_members_owner_insert
  on public.ethone_team_members for insert to authenticated
  with check ((select auth.uid()) = owner_id);

create policy ethone_team_members_owner_update
  on public.ethone_team_members for update to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy ethone_team_members_owner_delete
  on public.ethone_team_members for delete to authenticated
  using ((select auth.uid()) = owner_id);

-- Collaborators policies
drop policy if exists ethone_file_collaborators_owner_select on public.ethone_file_collaborators;
drop policy if exists ethone_file_collaborators_owner_insert on public.ethone_file_collaborators;
drop policy if exists ethone_file_collaborators_owner_update on public.ethone_file_collaborators;
drop policy if exists ethone_file_collaborators_owner_delete on public.ethone_file_collaborators;

create policy ethone_file_collaborators_owner_select
  on public.ethone_file_collaborators for select to authenticated
  using ((select auth.uid()) in (
    select owner_id from public.ethone_files where id = ethone_file_collaborators.file_id
    union
    select user_id from public.ethone_file_collaborators where file_id = ethone_file_collaborators.file_id
  ));

create policy ethone_file_collaborators_owner_insert
  on public.ethone_file_collaborators for insert to authenticated
  with check ((select auth.uid()) = (select owner_id from public.ethone_files where id = ethone_file_collaborators.file_id));

create policy ethone_file_collaborators_owner_update
  on public.ethone_file_collaborators for update to authenticated
  using ((select auth.uid()) = (select owner_id from public.ethone_files where id = ethone_file_collaborators.file_id))
  with check ((select auth.uid()) = (select owner_id from public.ethone_files where id = ethone_file_collaborators.file_id));

create policy ethone_file_collaborators_owner_delete
  on public.ethone_file_collaborators for delete to authenticated
  using ((select auth.uid()) = (select owner_id from public.ethone_files where id = ethone_file_collaborators.file_id));

revoke all on public.ethone_team_members from public;
revoke all on public.ethone_team_members from anon;
revoke truncate, references, trigger on public.ethone_team_members from authenticated;
grant select, insert, update, delete on public.ethone_team_members to authenticated;

revoke all on public.ethone_file_collaborators from public;
revoke all on public.ethone_file_collaborators from anon;
revoke truncate, references, trigger on public.ethone_file_collaborators from authenticated;
grant select, insert, update, delete on public.ethone_file_collaborators to authenticated;

commit;
