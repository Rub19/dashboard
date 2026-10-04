-- Bannières animées : le stockage du profil accepte aussi les GIF (limite inchangée, 5 Mo).
update storage.buckets set allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'] where id = 'profile-media';
