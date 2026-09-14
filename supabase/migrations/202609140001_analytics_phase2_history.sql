begin;

-- Analytics Phase 2 — real long-term history, built forward from here (not
-- retroactive: there is no way to reconstruct task-completion dates, focus
-- sessions, or past bill state that was never recorded before this shipped).

-- 1. tasks.completed_at — lets task completions be charted over time instead
-- of only "created over time". No RLS change needed: the existing
-- tasks_owner_* policies already cover every column via select */update.
alter table public.tasks add column if not exists completed_at timestamptz;

-- 2. Focus session history — an append-only log, unlike pomodoro_sessions
-- (a single-row-per-user upsert for LIVE timer state, not history).
create table if not exists public.ethone_focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  duration integer not null check (duration >= 0),
  preset text not null,
  goal text,
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists ethone_focus_sessions_user_completed_idx on public.ethone_focus_sessions (user_id, completed_at desc);

alter table public.ethone_focus_sessions enable row level security;
alter table public.ethone_focus_sessions force row level security;

create policy ethone_focus_sessions_owner_select
  on public.ethone_focus_sessions for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_focus_sessions_owner_insert
  on public.ethone_focus_sessions for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.ethone_focus_sessions from public;
revoke all on public.ethone_focus_sessions from anon;
revoke truncate, references, trigger, delete, update on public.ethone_focus_sessions from authenticated;
grant select, insert on public.ethone_focus_sessions to authenticated;

-- 3. Bills monthly spend snapshot — a snapshot row per (user, month), not a
-- full migration of the bills feature (which stays localStorage-only). Real
-- history accumulates one upsert at a time as the Analytics page is opened
-- each month, starting from whenever this ships.
create table if not exists public.ethone_bill_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month date not null,
  paid_amount numeric not null default 0,
  unpaid_amount numeric not null default 0,
  category_breakdown jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_bill_snapshots_user_month_unique unique (user_id, month)
);

create index if not exists ethone_bill_snapshots_user_month_idx on public.ethone_bill_snapshots (user_id, month desc);

alter table public.ethone_bill_snapshots enable row level security;
alter table public.ethone_bill_snapshots force row level security;

create policy ethone_bill_snapshots_owner_select
  on public.ethone_bill_snapshots for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_bill_snapshots_owner_insert
  on public.ethone_bill_snapshots for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_bill_snapshots_owner_update
  on public.ethone_bill_snapshots for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.ethone_bill_snapshots from public;
revoke all on public.ethone_bill_snapshots from anon;
revoke truncate, references, trigger, delete on public.ethone_bill_snapshots from authenticated;
grant select, insert, update on public.ethone_bill_snapshots to authenticated;

commit;
