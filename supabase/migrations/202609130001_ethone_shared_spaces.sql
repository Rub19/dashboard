begin;

-- Shared Spaces — real multi-user collaboration, built as a purpose-built
-- primitive rather than on top of the pre-existing ethone_team_members /
-- ethone_file_collaborators pair, which never actually granted access (no
-- policy on ethone_files ever referenced ethone_file_collaborators) and whose
-- invite link points at a route that doesn't exist. The load-bearing
-- correctness property here is the opposite: every policy on
-- ethone_space_tasks explicitly joins through ethone_shared_space_members
-- with status = 'active'.

create table if not exists public.ethone_shared_spaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ethone_shared_spaces_owner_idx on public.ethone_shared_spaces (owner_id);

-- Pending rows have user_id = null until the invite token is redeemed — that
-- redemption write happens through the Worker's service-role key (an RLS
-- policy keyed on auth.uid() can never match a row nobody has claimed yet).
create table if not exists public.ethone_shared_space_members (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.ethone_shared_spaces(id) on delete cascade,
  invited_email text not null,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  status text not null default 'pending' check (status in ('pending','active','declined','revoked')),
  invite_token text not null,
  invite_token_expires_at timestamptz not null default (now() + interval '7 days'),
  invited_by uuid not null references auth.users(id),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint ethone_shared_space_members_email_format check (invited_email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  constraint ethone_shared_space_members_space_email_unique unique (space_id, invited_email)
);

create index if not exists ethone_shared_space_members_space_idx on public.ethone_shared_space_members (space_id);
create unique index if not exists ethone_shared_space_members_token_idx on public.ethone_shared_space_members (invite_token);
create index if not exists ethone_shared_space_members_user_idx on public.ethone_shared_space_members (user_id);

create table if not exists public.ethone_space_tasks (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.ethone_shared_spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 500),
  description text,
  is_completed boolean not null default false,
  priority text not null default 'medium' check (priority in ('low','medium','high')),
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ethone_space_tasks_space_updated_idx on public.ethone_space_tasks (space_id, updated_at desc);

alter table public.ethone_shared_spaces enable row level security;
alter table public.ethone_shared_spaces force row level security;
alter table public.ethone_shared_space_members enable row level security;
alter table public.ethone_shared_space_members force row level security;
alter table public.ethone_space_tasks enable row level security;
alter table public.ethone_space_tasks force row level security;

-- Spaces: owner has full control; an active member can see the space row
-- (name/owner) but not modify it.
create policy ethone_shared_spaces_owner_all
  on public.ethone_shared_spaces for all to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy ethone_shared_spaces_member_select
  on public.ethone_shared_spaces for select to authenticated
  using (id in (
    select space_id from public.ethone_shared_space_members
    where user_id = (select auth.uid()) and status = 'active'
  ));

-- Members table: the owner manages every row for their own spaces; an
-- invitee-turned-caller can see and update ONLY their own row, and the
-- with check on update still requires user_id = auth.uid() (no role
-- escalation via a self-update).
create policy ethone_shared_space_members_owner_all
  on public.ethone_shared_space_members for all to authenticated
  using (space_id in (select id from public.ethone_shared_spaces where owner_id = (select auth.uid())))
  with check (space_id in (select id from public.ethone_shared_spaces where owner_id = (select auth.uid())));

create policy ethone_shared_space_members_self_select
  on public.ethone_shared_space_members for select to authenticated
  using (user_id = (select auth.uid()));

create policy ethone_shared_space_members_self_update
  on public.ethone_shared_space_members for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Space tasks: the policy ethone_file_collaborators never got — access is
-- granted to the space owner OR an ACTIVE member, checked by joining through
-- ethone_shared_space_members, not just trusting the space row.
create policy ethone_space_tasks_access_select
  on public.ethone_space_tasks for select to authenticated
  using (
    space_id in (select id from public.ethone_shared_spaces where owner_id = (select auth.uid()))
    or space_id in (
      select space_id from public.ethone_shared_space_members
      where user_id = (select auth.uid()) and status = 'active'
    )
  );

create policy ethone_space_tasks_access_insert
  on public.ethone_space_tasks for insert to authenticated
  with check (
    space_id in (select id from public.ethone_shared_spaces where owner_id = (select auth.uid()))
    or space_id in (
      select space_id from public.ethone_shared_space_members
      where user_id = (select auth.uid()) and status = 'active'
    )
  );

create policy ethone_space_tasks_access_update
  on public.ethone_space_tasks for update to authenticated
  using (
    space_id in (select id from public.ethone_shared_spaces where owner_id = (select auth.uid()))
    or space_id in (
      select space_id from public.ethone_shared_space_members
      where user_id = (select auth.uid()) and status = 'active'
    )
  )
  with check (
    space_id in (select id from public.ethone_shared_spaces where owner_id = (select auth.uid()))
    or space_id in (
      select space_id from public.ethone_shared_space_members
      where user_id = (select auth.uid()) and status = 'active'
    )
  );

create policy ethone_space_tasks_access_delete
  on public.ethone_space_tasks for delete to authenticated
  using (
    space_id in (select id from public.ethone_shared_spaces where owner_id = (select auth.uid()))
    or space_id in (
      select space_id from public.ethone_shared_space_members
      where user_id = (select auth.uid()) and status = 'active'
    )
  );

revoke all on public.ethone_shared_spaces from public;
revoke all on public.ethone_shared_spaces from anon;
revoke truncate, references, trigger on public.ethone_shared_spaces from authenticated;
grant select, insert, update, delete on public.ethone_shared_spaces to authenticated;

revoke all on public.ethone_shared_space_members from public;
revoke all on public.ethone_shared_space_members from anon;
revoke truncate, references, trigger on public.ethone_shared_space_members from authenticated;
grant select, update on public.ethone_shared_space_members to authenticated;

revoke all on public.ethone_space_tasks from public;
revoke all on public.ethone_space_tasks from anon;
revoke truncate, references, trigger on public.ethone_space_tasks from authenticated;
grant select, insert, update, delete on public.ethone_space_tasks to authenticated;

commit;
