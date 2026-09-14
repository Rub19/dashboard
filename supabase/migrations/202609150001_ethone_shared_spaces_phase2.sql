begin;

-- Shared Spaces Phase 2 — shared calendar, shared notes, and an optional
-- link to a Discord guild/channel for activity notifications.
--
-- ethone_space_events / ethone_space_notes are additive tables that
-- mechanically copy ethone_space_tasks's exact access pattern (owner OR
-- active member, joined through ethone_shared_space_members) — the
-- load-bearing correctness property from Phase 1 is not being reinvented
-- here, just repeated per table.
--
-- discord_guild_id / discord_channel_id on ethone_shared_spaces are plain
-- nullable columns: no new RLS is needed since ethone_shared_spaces_owner_all
-- already covers updates to any column, and the existing member-select
-- policy already lets members see the link (useful — they should know
-- activity is posted to Discord).

create table if not exists public.ethone_space_events (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.ethone_shared_spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 300),
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_space_events_end_after_start check (end_at is null or end_at >= start_at)
);

create index if not exists ethone_space_events_space_start_idx on public.ethone_space_events (space_id, start_at);

create table if not exists public.ethone_space_notes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references public.ethone_shared_spaces(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  title text not null check (char_length(title) between 1 and 300),
  body text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ethone_space_notes_space_updated_idx on public.ethone_space_notes (space_id, updated_at desc);

alter table public.ethone_shared_spaces
  add column if not exists discord_guild_id text,
  add column if not exists discord_channel_id text,
  add column if not exists discord_linked_at timestamptz;

alter table public.ethone_space_events enable row level security;
alter table public.ethone_space_events force row level security;
alter table public.ethone_space_notes enable row level security;
alter table public.ethone_space_notes force row level security;

create policy ethone_space_events_access_select
  on public.ethone_space_events for select to authenticated
  using (
    space_id in (select id from public.ethone_shared_spaces where owner_id = (select auth.uid()))
    or space_id in (
      select space_id from public.ethone_shared_space_members
      where user_id = (select auth.uid()) and status = 'active'
    )
  );

create policy ethone_space_events_access_insert
  on public.ethone_space_events for insert to authenticated
  with check (
    space_id in (select id from public.ethone_shared_spaces where owner_id = (select auth.uid()))
    or space_id in (
      select space_id from public.ethone_shared_space_members
      where user_id = (select auth.uid()) and status = 'active'
    )
  );

create policy ethone_space_events_access_update
  on public.ethone_space_events for update to authenticated
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

create policy ethone_space_events_access_delete
  on public.ethone_space_events for delete to authenticated
  using (
    space_id in (select id from public.ethone_shared_spaces where owner_id = (select auth.uid()))
    or space_id in (
      select space_id from public.ethone_shared_space_members
      where user_id = (select auth.uid()) and status = 'active'
    )
  );

create policy ethone_space_notes_access_select
  on public.ethone_space_notes for select to authenticated
  using (
    space_id in (select id from public.ethone_shared_spaces where owner_id = (select auth.uid()))
    or space_id in (
      select space_id from public.ethone_shared_space_members
      where user_id = (select auth.uid()) and status = 'active'
    )
  );

create policy ethone_space_notes_access_insert
  on public.ethone_space_notes for insert to authenticated
  with check (
    space_id in (select id from public.ethone_shared_spaces where owner_id = (select auth.uid()))
    or space_id in (
      select space_id from public.ethone_shared_space_members
      where user_id = (select auth.uid()) and status = 'active'
    )
  );

create policy ethone_space_notes_access_update
  on public.ethone_space_notes for update to authenticated
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

create policy ethone_space_notes_access_delete
  on public.ethone_space_notes for delete to authenticated
  using (
    space_id in (select id from public.ethone_shared_spaces where owner_id = (select auth.uid()))
    or space_id in (
      select space_id from public.ethone_shared_space_members
      where user_id = (select auth.uid()) and status = 'active'
    )
  );

revoke all on public.ethone_space_events from public;
revoke all on public.ethone_space_events from anon;
revoke truncate, references, trigger on public.ethone_space_events from authenticated;
grant select, insert, update, delete on public.ethone_space_events to authenticated;

revoke all on public.ethone_space_notes from public;
revoke all on public.ethone_space_notes from anon;
revoke truncate, references, trigger on public.ethone_space_notes from authenticated;
grant select, insert, update, delete on public.ethone_space_notes to authenticated;

commit;
