create table if not exists public.ethone_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('note','task','event')),
  title text not null,
  body text,
  done boolean default false,
  start_at timestamptz,
  end_at timestamptz,
  data jsonb default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ethone_items enable row level security;

create policy "Users can manage own items"
  on public.ethone_items
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create index ethone_items_user_id_idx on public.ethone_items (user_id);
create index ethone_items_kind_idx on public.ethone_items (kind);
create index ethone_items_updated_at_idx on public.ethone_items (updated_at desc);

comment on table public.ethone_items is 'ETHONE synchronized notes, tasks and calendar events.';
