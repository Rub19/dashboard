begin;

-- Real long-term gaming history (LoL/Valorant/TFT), the piece explicitly
-- deferred from Analytics Phase 2 (v1.21.47) because the originally-scoped
-- design (a Cloudflare Cron Trigger duplicating Riot-API-calling logic
-- server-side, with per-user API key rate limiting) was meaningfully
-- riskier than everything else in that pass. Re-scoped here to match the
-- already-shipped bills-snapshot pattern instead: the client already
-- computes real win rates from data the tracker pages cached locally
-- (useGamingAnalytics.ts, itself reading localStorage -- no server-side
-- Riot calls at all), so a snapshot just needs one client-triggered upsert
-- per day, no new infrastructure.

create table if not exists public.ethone_gaming_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  lol_games integer not null default 0,
  lol_win_rate integer,
  valorant_games integer not null default 0,
  valorant_win_rate integer,
  tft_games integer not null default 0,
  tft_top4_rate integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_gaming_snapshots_user_day_unique unique (user_id, day)
);

create index if not exists ethone_gaming_snapshots_user_day_idx on public.ethone_gaming_snapshots (user_id, day desc);

alter table public.ethone_gaming_snapshots enable row level security;
alter table public.ethone_gaming_snapshots force row level security;

create policy ethone_gaming_snapshots_owner_select
  on public.ethone_gaming_snapshots for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_gaming_snapshots_owner_insert
  on public.ethone_gaming_snapshots for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_gaming_snapshots_owner_update
  on public.ethone_gaming_snapshots for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.ethone_gaming_snapshots from public;
revoke all on public.ethone_gaming_snapshots from anon;
revoke truncate, references, trigger, delete on public.ethone_gaming_snapshots from authenticated;
grant select, insert, update on public.ethone_gaming_snapshots to authenticated;

commit;
