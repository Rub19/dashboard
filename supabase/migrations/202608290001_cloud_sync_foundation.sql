begin;

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'dark',
  language text not null default 'fr',
  dynamic_island_visible boolean not null default true,
  dock_position text not null default 'bottom',
  wallpaper_url text,
  updated_at timestamptz not null default now()
);

comment on table public.user_settings is 'ETHONE global UI and syncable preferences per user.';

alter table public.user_settings enable row level security;
alter table public.user_settings force row level security;

drop policy if exists user_settings_owner_select on public.user_settings;
drop policy if exists user_settings_owner_insert on public.user_settings;
drop policy if exists user_settings_owner_update on public.user_settings;
drop policy if exists user_settings_owner_delete on public.user_settings;

create policy user_settings_owner_select
  on public.user_settings for select to authenticated
  using (user_id = (select auth.uid()));

create policy user_settings_owner_insert
  on public.user_settings for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy user_settings_owner_update
  on public.user_settings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy user_settings_owner_delete
  on public.user_settings for delete to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.desktop_layout (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  widgets jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.desktop_layout is 'ETHONE Bento grid widget positions and visibility per user.';

alter table public.desktop_layout enable row level security;
alter table public.desktop_layout force row level security;

drop policy if exists desktop_layout_owner_select on public.desktop_layout;
drop policy if exists desktop_layout_owner_insert on public.desktop_layout;
drop policy if exists desktop_layout_owner_update on public.desktop_layout;
drop policy if exists desktop_layout_owner_delete on public.desktop_layout;

create policy desktop_layout_owner_select
  on public.desktop_layout for select to authenticated
  using (user_id = (select auth.uid()));

create policy desktop_layout_owner_insert
  on public.desktop_layout for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy desktop_layout_owner_update
  on public.desktop_layout for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy desktop_layout_owner_delete
  on public.desktop_layout for delete to authenticated
  using (user_id = (select auth.uid()));

-- One layout row per user; conflicts can be upserted on user_id.
create unique index desktop_layout_user_id_idx on public.desktop_layout (user_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  is_completed boolean not null default false,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.tasks is 'ETHONE synchronized task list per user.';

alter table public.tasks enable row level security;
alter table public.tasks force row level security;

drop policy if exists tasks_owner_select on public.tasks;
drop policy if exists tasks_owner_insert on public.tasks;
drop policy if exists tasks_owner_update on public.tasks;
drop policy if exists tasks_owner_delete on public.tasks;

create policy tasks_owner_select
  on public.tasks for select to authenticated
  using (user_id = (select auth.uid()));

create policy tasks_owner_insert
  on public.tasks for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy tasks_owner_update
  on public.tasks for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy tasks_owner_delete
  on public.tasks for delete to authenticated
  using (user_id = (select auth.uid()));

create index tasks_user_id_updated_at_idx on public.tasks (user_id, updated_at desc);

create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'work' check (mode in ('work', 'short_break', 'long_break')),
  time_remaining_seconds int not null default 0,
  is_running boolean not null default false,
  started_at timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.pomodoro_sessions is 'ETHONE active and recent Pomodoro session state per user.';

alter table public.pomodoro_sessions enable row level security;
alter table public.pomodoro_sessions force row level security;

drop policy if exists pomodoro_sessions_owner_select on public.pomodoro_sessions;
drop policy if exists pomodoro_sessions_owner_insert on public.pomodoro_sessions;
drop policy if exists pomodoro_sessions_owner_update on public.pomodoro_sessions;
drop policy if exists pomodoro_sessions_owner_delete on public.pomodoro_sessions;

create policy pomodoro_sessions_owner_select
  on public.pomodoro_sessions for select to authenticated
  using (user_id = (select auth.uid()));

create policy pomodoro_sessions_owner_insert
  on public.pomodoro_sessions for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy pomodoro_sessions_owner_update
  on public.pomodoro_sessions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy pomodoro_sessions_owner_delete
  on public.pomodoro_sessions for delete to authenticated
  using (user_id = (select auth.uid()));

create unique index pomodoro_sessions_user_id_idx on public.pomodoro_sessions (user_id);

-- Revoke broad permissions and grant only the needed DML to authenticated users.
revoke all on public.user_settings, public.desktop_layout, public.tasks, public.pomodoro_sessions from anon;
revoke truncate, references, trigger on public.user_settings, public.desktop_layout, public.tasks, public.pomodoro_sessions from authenticated;
grant select, insert, update, delete on public.user_settings, public.desktop_layout, public.tasks, public.pomodoro_sessions to authenticated;

commit;
