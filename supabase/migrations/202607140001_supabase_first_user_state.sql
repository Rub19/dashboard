begin;

create table if not exists public.ethone_user_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  mutation_id text not null default '',
  updated_at timestamptz not null default now(),
  constraint ethone_user_state_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint ethone_user_state_payload_size check (pg_column_size(payload) <= 5000000)
);

alter table public.ethone_user_state enable row level security;
alter table public.ethone_user_state force row level security;

drop policy if exists ethone_user_state_owner_select on public.ethone_user_state;
drop policy if exists ethone_user_state_owner_insert on public.ethone_user_state;
drop policy if exists ethone_user_state_owner_update on public.ethone_user_state;
drop policy if exists ethone_user_state_owner_delete on public.ethone_user_state;

create policy ethone_user_state_owner_select
  on public.ethone_user_state for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_user_state_owner_insert
  on public.ethone_user_state for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_user_state_owner_update
  on public.ethone_user_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ethone_user_state_owner_delete
  on public.ethone_user_state for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ethone_user_state from anon;
revoke truncate, references, trigger on public.ethone_user_state from authenticated;
grant select, insert, update, delete on public.ethone_user_state to authenticated;

commit;
