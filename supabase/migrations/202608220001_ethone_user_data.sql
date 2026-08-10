begin;

create table if not exists public.ethone_user_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('space','flow','interaction')),
  slug text not null default '',
  label text not null default '',
  data jsonb default '{}',
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ethone_user_data enable row level security;
alter table public.ethone_user_data force row level security;

create policy "ethone_user_data_owner_select"
  on public.ethone_user_data for select to authenticated
  using (user_id = auth.uid());

create policy "ethone_user_data_owner_insert"
  on public.ethone_user_data for insert to authenticated
  with check (user_id = auth.uid());

create policy "ethone_user_data_owner_update"
  on public.ethone_user_data for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "ethone_user_data_owner_delete"
  on public.ethone_user_data for delete to authenticated
  using (user_id = auth.uid());

create index ethone_user_data_user_id_idx on public.ethone_user_data (user_id);
create index ethone_user_data_kind_idx on public.ethone_user_data (kind);
create index ethone_user_data_updated_at_idx on public.ethone_user_data (updated_at desc);

revoke all on public.ethone_user_data from public;
revoke all on public.ethone_user_data from anon;
revoke truncate, references, trigger on public.ethone_user_data from authenticated;
grant select, insert, update, delete on public.ethone_user_data to authenticated;

comment on table public.ethone_user_data is 'ETHONE user data for spaces, flows and interactions.';

commit;
