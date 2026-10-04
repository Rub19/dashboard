-- Ancienne bibliothèque d'avatars retirée : les comptes qui l'utilisaient pointent vers l'équivalent de la nouvelle.
update auth.users set raw_user_meta_data = raw_user_meta_data
  || case when raw_user_meta_data->>'avatar_url' = '/avatars/riot-lol-ahri.png' then '{"avatar_url":"/avatars/library/lol/ahri.webp"}'::jsonb else '{}'::jsonb end
  || case when raw_user_meta_data->>'custom_avatar_url' = '/avatars/riot-lol-ahri.png' then '{"custom_avatar_url":"/avatars/library/lol/ahri.webp"}'::jsonb else '{}'::jsonb end
  || case when raw_user_meta_data->>'custom_avatar_url' = '/avatars/crunchyroll-gojo.svg' then '{"custom_avatar_url":"/avatars/library/anime/jujutsu-kaisen-satoru-gojou.webp"}'::jsonb else '{}'::jsonb end
where raw_user_meta_data->>'avatar_url' = '/avatars/riot-lol-ahri.png'
   or raw_user_meta_data->>'custom_avatar_url' in ('/avatars/riot-lol-ahri.png', '/avatars/crunchyroll-gojo.svg');
