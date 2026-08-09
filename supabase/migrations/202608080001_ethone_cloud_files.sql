begin;

-- ETHONE Cloud files: metadata lives in Supabase, binaries live in Google Drive.
create table if not exists public.ethone_files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  parent_id uuid references public.ethone_files(id) on delete set null,
  drive_file_id text not null,
  drive_parent_id text,
  name text not null check (char_length(name) between 1 and 500),
  mime_type text not null default 'application/octet-stream' check (char_length(mime_type) between 1 and 120),
  is_folder boolean not null default false,
  size bigint not null default 0 check (size >= 0),
  web_view_link text check (char_length(web_view_link) <= 2000),
  thumbnail_link text check (char_length(thumbnail_link) <= 2000),
  icon_url text check (char_length(icon_url) <= 2000),
  md5_checksum text check (char_length(md5_checksum) <= 64),
  trashed boolean not null default false,
  drive_created_at timestamptz,
  drive_modified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_files_user_drive_unique unique (user_id, drive_file_id),
  constraint ethone_files_no_folder_size check (is_folder = false or size = 0),
  constraint ethone_files_no_self_parent check (id <> parent_id)
);

-- Share links: public, password-protected, expiring, download-limited.
create table if not exists public.ethone_file_shares (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id uuid not null references public.ethone_files(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-zA-Z0-9_-]{12,64}$'),
  visibility text not null default 'public' check (visibility in ('public','private','password')),
  password_hash text check (char_length(password_hash) <= 256),
  expires_at timestamptz,
  max_downloads int not null default 0 check (max_downloads >= 0),
  download_count int not null default 0 check (download_count >= 0),
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- File drops: receive files from external people without an ETHONE account.
create table if not exists public.ethone_file_drops (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-zA-Z0-9_-]{12,64}$'),
  title text not null check (char_length(title) between 1 and 200),
  description text check (char_length(description) <= 1000),
  visibility text not null default 'public' check (visibility in ('public','password')),
  password_hash text check (char_length(password_hash) <= 256),
  expires_at timestamptz,
  max_files int not null default 0 check (max_files >= 0),
  max_size bigint not null default 0 check (max_size >= 0),
  file_count int not null default 0 check (file_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Activity log for file events.
create table if not exists public.ethone_file_activity (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id uuid references public.ethone_files(id) on delete set null,
  share_id uuid references public.ethone_file_shares(id) on delete set null,
  drop_id uuid references public.ethone_file_drops(id) on delete set null,
  event_type text not null check (event_type in ('uploaded','shared','link_created','downloaded','link_revoked','deleted','moved','renamed','folder_created','drop_received')),
  details jsonb not null default '{}'::jsonb,
  ip_hash text check (char_length(ip_hash) <= 128),
  created_at timestamptz not null default now()
);

-- Favorites (many-to-many).
create table if not exists public.ethone_file_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  file_id uuid not null references public.ethone_files(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, file_id)
);

-- Indexes.
create index if not exists ethone_files_user_parent_idx on public.ethone_files (user_id, parent_id, trashed, updated_at desc);
create index if not exists ethone_files_user_drive_file_idx on public.ethone_files (user_id, drive_file_id);
create index if not exists ethone_files_user_name_idx on public.ethone_files (user_id, lower(name));

create index if not exists ethone_file_shares_slug_idx on public.ethone_file_shares (slug);
create index if not exists ethone_file_shares_user_idx on public.ethone_file_shares (user_id, updated_at desc);

create index if not exists ethone_file_drops_slug_idx on public.ethone_file_drops (slug);
create index if not exists ethone_file_drops_user_idx on public.ethone_file_drops (user_id, updated_at desc);

create index if not exists ethone_file_activity_user_created_idx on public.ethone_file_activity (user_id, created_at desc);

-- Row Level Security.
alter table public.ethone_files enable row level security;
alter table public.ethone_files force row level security;
alter table public.ethone_file_shares enable row level security;
alter table public.ethone_file_shares force row level security;
alter table public.ethone_file_drops enable row level security;
alter table public.ethone_file_drops force row level security;
alter table public.ethone_file_activity enable row level security;
alter table public.ethone_file_activity force row level security;
alter table public.ethone_file_favorites enable row level security;
alter table public.ethone_file_favorites force row level security;

-- Owner policies.
drop policy if exists ethone_files_owner_select on public.ethone_files;
create policy ethone_files_owner_select on public.ethone_files for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists ethone_files_owner_insert on public.ethone_files;
create policy ethone_files_owner_insert on public.ethone_files for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists ethone_files_owner_update on public.ethone_files;
create policy ethone_files_owner_update on public.ethone_files for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists ethone_files_owner_delete on public.ethone_files;
create policy ethone_files_owner_delete on public.ethone_files for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists ethone_file_shares_owner_select on public.ethone_file_shares;
create policy ethone_file_shares_owner_select on public.ethone_file_shares for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists ethone_file_shares_owner_insert on public.ethone_file_shares;
create policy ethone_file_shares_owner_insert on public.ethone_file_shares for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists ethone_file_shares_owner_update on public.ethone_file_shares;
create policy ethone_file_shares_owner_update on public.ethone_file_shares for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists ethone_file_shares_owner_delete on public.ethone_file_shares;
create policy ethone_file_shares_owner_delete on public.ethone_file_shares for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists ethone_file_drops_owner_select on public.ethone_file_drops;
create policy ethone_file_drops_owner_select on public.ethone_file_drops for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists ethone_file_drops_owner_insert on public.ethone_file_drops;
create policy ethone_file_drops_owner_insert on public.ethone_file_drops for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists ethone_file_drops_owner_update on public.ethone_file_drops;
create policy ethone_file_drops_owner_update on public.ethone_file_drops for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists ethone_file_drops_owner_delete on public.ethone_file_drops;
create policy ethone_file_drops_owner_delete on public.ethone_file_drops for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists ethone_file_activity_owner_select on public.ethone_file_activity;
create policy ethone_file_activity_owner_select on public.ethone_file_activity for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists ethone_file_activity_owner_insert on public.ethone_file_activity;
create policy ethone_file_activity_owner_insert on public.ethone_file_activity for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists ethone_file_favorites_owner_select on public.ethone_file_favorites;
create policy ethone_file_favorites_owner_select on public.ethone_file_favorites for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists ethone_file_favorites_owner_insert on public.ethone_file_favorites;
create policy ethone_file_favorites_owner_insert on public.ethone_file_favorites for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists ethone_file_favorites_owner_delete on public.ethone_file_favorites;
create policy ethone_file_favorites_owner_delete on public.ethone_file_favorites for delete to authenticated using ((select auth.uid()) = user_id);

-- Anonymous access is handled by the ETHONE Worker using the service role key.
revoke all on public.ethone_files from anon;
revoke all on public.ethone_file_shares from anon;
revoke all on public.ethone_file_drops from anon;
revoke all on public.ethone_file_activity from anon;
revoke all on public.ethone_file_favorites from anon;

grant select, insert, update, delete on public.ethone_files to authenticated;
grant select, insert, update, delete on public.ethone_file_shares to authenticated;
grant select, insert, update, delete on public.ethone_file_drops to authenticated;
grant select, insert on public.ethone_file_activity to authenticated;
grant select, insert, delete on public.ethone_file_favorites to authenticated;

commit;