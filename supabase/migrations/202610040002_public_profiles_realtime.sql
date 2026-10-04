-- Profil synchronisé en direct entre appareils.
-- 1. Les changements de ethone_public_profiles sont diffusés (Supabase Realtime) : un appareil voit tout de suite
--    l'avatar, le nom ou le statut modifiés sur un autre.
-- 2. avatar_url accepte aussi les avatars de la bibliothèque hébergés sur le site (/avatars/...). Avant, seul https://
--    passait : choisir un avatar de la bibliothèque échouait côté base et ne restait que dans le navigateur.
-- 3. Statut personnalisé (emoji + texte) stocké avec le profil.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ethone_public_profiles'
  ) then
    alter publication supabase_realtime add table public.ethone_public_profiles;
  end if;
end $$;

alter table public.ethone_public_profiles drop constraint if exists ethone_public_profiles_avatar_url;
alter table public.ethone_public_profiles add constraint ethone_public_profiles_avatar_url check (
  avatar_url = ''
  or (char_length(avatar_url) <= 1200 and avatar_url ~ '^https://[^[:space:]<>]+$')
  or avatar_url ~ '^/avatars/[a-z0-9/_.-]{1,200}\.(webp|png|svg|jpg)$'
);

alter table public.ethone_public_profiles add column if not exists status_text text not null default '';
alter table public.ethone_public_profiles add column if not exists status_emoji text not null default '';
alter table public.ethone_public_profiles drop constraint if exists ethone_public_profiles_status_text_length;
alter table public.ethone_public_profiles add constraint ethone_public_profiles_status_text_length check (char_length(status_text) <= 80);
alter table public.ethone_public_profiles drop constraint if exists ethone_public_profiles_status_emoji_length;
alter table public.ethone_public_profiles add constraint ethone_public_profiles_status_emoji_length check (char_length(status_emoji) <= 16);
