-- Gère les collisions de username lors de la création de compte.
-- Le trigger auth.users/on_auth_user_created insère une ligne dans public.profiles.
-- Si le username demandé est déjà pris, on ajoute un suffixe aléatoire pour éviter
-- l'erreur "duplicate key value violates unique constraint \"profiles_username_key\"".

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  base_username text;
  candidate text;
  suffix text;
BEGIN
  base_username := COALESCE(NULLIF(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1));
  IF base_username IS NULL OR base_username = '' THEN
    base_username := 'user';
  END IF;
  candidate := base_username;

  FOR i IN 1..10 LOOP
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE username = candidate) THEN
      EXIT;
    END IF;
    suffix := substring(encode(extensions.gen_random_bytes(2), 'hex'), 1, 4);
    candidate := base_username || '-' || suffix;
  END LOOP;

  INSERT INTO public.profiles (id, username, email)
  VALUES (new.id, candidate, new.email);

  RETURN new;
END;
$$;
