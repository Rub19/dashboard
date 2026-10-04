-- Bannière personnalisée de la carte de profil (image importée dans profile-media, GIF animé accepté).
alter table public.ethone_public_profiles add column if not exists banner_url text not null default '';
alter table public.ethone_public_profiles drop constraint if exists ethone_public_profiles_banner_url;
alter table public.ethone_public_profiles add constraint ethone_public_profiles_banner_url check (
  banner_url = '' or (char_length(banner_url) <= 1200 and banner_url ~ '^https://[^[:space:]<>]+$')
);
