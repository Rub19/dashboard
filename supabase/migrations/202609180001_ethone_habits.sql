begin;

-- Habit/goal tracker: a habit definition plus a per-day completion log
-- (separate table, one row per habit per calendar day) so streaks and
-- history grids are a simple indexed range query instead of parsing a
-- JSON blob. Mirrors the ethone_-prefixed table + owner-scoped RLS pattern
-- used by every table added since the foundational migration (see e.g.
-- ethone_gaming_snapshots).

create table if not exists public.ethone_habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  emoji text,
  color text,
  target_per_week integer not null default 7 check (target_per_week between 1 and 7),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ethone_habits is 'ETHONE habit/goal tracker definitions per user.';

alter table public.ethone_habits enable row level security;
alter table public.ethone_habits force row level security;

create policy ethone_habits_owner_select
  on public.ethone_habits for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_habits_owner_insert
  on public.ethone_habits for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_habits_owner_update
  on public.ethone_habits for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ethone_habits_owner_delete
  on public.ethone_habits for delete to authenticated
  using ((select auth.uid()) = user_id);

create index ethone_habits_user_id_idx on public.ethone_habits (user_id, archived, updated_at desc);

create table if not exists public.ethone_habit_completions (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.ethone_habits(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  completed_on date not null,
  created_at timestamptz not null default now(),
  constraint ethone_habit_completions_habit_day_unique unique (habit_id, completed_on)
);

comment on table public.ethone_habit_completions is 'ETHONE habit tracker: one row per habit per completed calendar day.';

alter table public.ethone_habit_completions enable row level security;
alter table public.ethone_habit_completions force row level security;

-- No update policy: a day is either logged or not — "un-checking" a day is
-- a delete, "checking" it is an insert, so a 3-policy set is enough.
create policy ethone_habit_completions_owner_select
  on public.ethone_habit_completions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_habit_completions_owner_insert
  on public.ethone_habit_completions for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_habit_completions_owner_delete
  on public.ethone_habit_completions for delete to authenticated
  using ((select auth.uid()) = user_id);

create index ethone_habit_completions_habit_id_completed_on_idx
  on public.ethone_habit_completions (habit_id, completed_on desc);

revoke all on public.ethone_habits, public.ethone_habit_completions from public;
revoke all on public.ethone_habits, public.ethone_habit_completions from anon;
revoke truncate, references, trigger on public.ethone_habits, public.ethone_habit_completions from authenticated;
grant select, insert, update, delete on public.ethone_habits to authenticated;
grant select, insert, delete on public.ethone_habit_completions to authenticated;

commit;
