begin;

alter table public.pomodoro_sessions
  add column if not exists data jsonb not null default '{}'::jsonb,
  add constraint pomodoro_sessions_data_object check (jsonb_typeof(data) = 'object');

comment on column public.pomodoro_sessions.data is 'Full ETHONE FocusTimer session state for cross-device sync.';

commit;
