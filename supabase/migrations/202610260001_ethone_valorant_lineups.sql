begin;

create table if not exists public.ethone_valorant_lineups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  description text not null default '',
  agent integer not null,
  ability integer not null,
  map_id integer not null,
  tags integer[] not null default '{}',
  images text[] not null default '{}',
  video text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_valorant_lineups_name_length check (char_length(name) between 1 and 120),
  constraint ethone_valorant_lineups_description_length check (char_length(description) <= 2000),
  constraint ethone_valorant_lineups_video_length check (char_length(video) <= 300),
  constraint ethone_valorant_lineups_images_count check (cardinality(images) <= 8)
);

create index if not exists ethone_valorant_lineups_user_idx on public.ethone_valorant_lineups (user_id, created_at desc);

alter table public.ethone_valorant_lineups enable row level security;

drop policy if exists "lineups_select_own" on public.ethone_valorant_lineups;
create policy "lineups_select_own" on public.ethone_valorant_lineups
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "lineups_insert_own" on public.ethone_valorant_lineups;
create policy "lineups_insert_own" on public.ethone_valorant_lineups
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "lineups_update_own" on public.ethone_valorant_lineups;
create policy "lineups_update_own" on public.ethone_valorant_lineups
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

drop policy if exists "lineups_delete_own" on public.ethone_valorant_lineups;
create policy "lineups_delete_own" on public.ethone_valorant_lineups
  for delete to authenticated using ((select auth.uid()) = user_id);

commit;
