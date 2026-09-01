begin;

-- ============================================================
-- ETHONE Identity System — Phase 1 : data model
-- ============================================================

-- Public profile = source of truth for the user's cross-platform identity.
alter table public.ethone_public_profiles
  add column if not exists avatar_id text not null default '',
  add column if not exists avatar_frame_id text not null default '',
  add column if not exists profile_background_id text not null default '',
  add column if not exists badge_ids jsonb not null default '[]'::jsonb,
  add column if not exists accent_color text not null default '',
  add column if not exists presence_status text not null default 'offline',
  add column if not exists bio text not null default '';

-- Constraints for data quality
alter table public.ethone_public_profiles
  drop constraint if exists ethone_public_profiles_presence_status_check,
  add constraint ethone_public_profiles_presence_status_check
    check (presence_status in ('online','available','busy','dnd','away','invisible','offline')),
  drop constraint if exists ethone_public_profiles_accent_color_length,
  add constraint ethone_public_profiles_accent_color_length
    check (char_length(accent_color) <= 32),
  drop constraint if exists ethone_public_profiles_bio_length,
  add constraint ethone_public_profiles_bio_length
    check (char_length(bio) <= 300),
  drop constraint if exists ethone_public_profiles_avatar_id_length,
  add constraint ethone_public_profiles_avatar_id_length
    check (char_length(avatar_id) <= 64),
  drop constraint if exists ethone_public_profiles_avatar_frame_id_length,
  add constraint ethone_public_profiles_avatar_frame_id_length
    check (char_length(avatar_frame_id) <= 64),
  drop constraint if exists ethone_public_profiles_profile_background_id_length,
  add constraint ethone_public_profiles_profile_background_id_length
    check (char_length(profile_background_id) <= 64);

-- Extensible library of original ETHONE identity assets (avatars, frames, backgrounds, badges, etc.)
create table if not exists public.ethone_identity_assets (
  id text primary key,
  name text not null,
  category text not null,
  kind text not null,
  rarity text not null default 'common',
  description text not null default '',
  tags jsonb not null default '[]'::jsonb,
  asset_url text not null default '',
  thumbnail_url text not null default '',
  accent text not null default '',
  status text not null default 'active',
  added_at timestamptz not null default now(),
  constraint ethone_identity_assets_kind_check
    check (kind in ('avatar','frame','background','badge','cosmetic')),
  constraint ethone_identity_assets_rarity_check
    check (rarity in ('common','uncommon','rare','epic','legendary','mythic')),
  constraint ethone_identity_assets_status_check
    check (status in ('active','inactive','seasonal','limited'))
);

create index if not exists ethone_identity_assets_category_idx
  on public.ethone_identity_assets (category);
create index if not exists ethone_identity_assets_kind_idx
  on public.ethone_identity_assets (kind);
create index if not exists ethone_identity_assets_rarity_idx
  on public.ethone_identity_assets (rarity);

-- User favorites, scoped by asset kind
create table if not exists public.ethone_identity_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id text not null,
  kind text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, asset_id, kind),
  constraint ethone_identity_favorites_kind_check
    check (kind in ('avatar','frame','background','badge','cosmetic'))
);

create index if not exists ethone_identity_favorites_user_id_idx
  on public.ethone_identity_favorites (user_id);

-- Recent avatars used by each user (quick switch)
create table if not exists public.ethone_identity_recent (
  user_id uuid not null references auth.users(id) on delete cascade,
  asset_id text not null,
  kind text not null,
  used_at timestamptz not null default now(),
  primary key (user_id, asset_id, kind),
  constraint ethone_identity_recent_kind_check
    check (kind in ('avatar','frame','background','badge','cosmetic'))
);

create index if not exists ethone_identity_recent_user_id_idx
  on public.ethone_identity_recent (user_id);

-- RLS
alter table public.ethone_public_profiles enable row level security;
alter table public.ethone_public_profiles force row level security;
alter table public.ethone_identity_assets enable row level security;
alter table public.ethone_identity_assets force row level security;
alter table public.ethone_identity_favorites enable row level security;
alter table public.ethone_identity_favorites force row level security;
alter table public.ethone_identity_recent enable row level security;
alter table public.ethone_identity_recent force row level security;

-- Public profiles: owner only
revoke all on public.ethone_public_profiles from public;
revoke all on public.ethone_public_profiles from anon;
revoke truncate, references, trigger on public.ethone_public_profiles from authenticated;
grant select, insert, update, delete on public.ethone_public_profiles to authenticated;

-- Assets: readable by everyone, writable only by service/admin later
revoke all on public.ethone_identity_assets from public;
revoke all on public.ethone_identity_assets from anon;
grant select on public.ethone_identity_assets to anon;
grant select on public.ethone_identity_assets to authenticated;

-- Favorites: owner only
drop policy if exists ethone_identity_favorites_owner_select on public.ethone_identity_favorites;
drop policy if exists ethone_identity_favorites_owner_insert on public.ethone_identity_favorites;
drop policy if exists ethone_identity_favorites_owner_delete on public.ethone_identity_favorites;

create policy ethone_identity_favorites_owner_select
  on public.ethone_identity_favorites for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_identity_favorites_owner_insert
  on public.ethone_identity_favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_identity_favorites_owner_delete
  on public.ethone_identity_favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ethone_identity_favorites from public;
revoke all on public.ethone_identity_favorites from anon;
revoke truncate, references, trigger on public.ethone_identity_favorites from authenticated;
grant select, insert, delete on public.ethone_identity_favorites to authenticated;

-- Recent: owner only
drop policy if exists ethone_identity_recent_owner_select on public.ethone_identity_recent;
drop policy if exists ethone_identity_recent_owner_insert on public.ethone_identity_recent;
drop policy if exists ethone_identity_recent_owner_update on public.ethone_identity_recent;
drop policy if exists ethone_identity_recent_owner_delete on public.ethone_identity_recent;

create policy ethone_identity_recent_owner_select
  on public.ethone_identity_recent for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_identity_recent_owner_insert
  on public.ethone_identity_recent for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_identity_recent_owner_update
  on public.ethone_identity_recent for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ethone_identity_recent_owner_delete
  on public.ethone_identity_recent for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ethone_identity_recent from public;
revoke all on public.ethone_identity_recent from anon;
revoke truncate, references, trigger on public.ethone_identity_recent from authenticated;
grant select, insert, update, delete on public.ethone_identity_recent to authenticated;

commit;
