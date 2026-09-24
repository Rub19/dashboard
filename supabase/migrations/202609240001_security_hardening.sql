begin;

-- Durcissement issu de l'audit de sécurité Supabase du 2026-09-24.
--
-- 1. ethone_user_data : accès réservé au Worker (service_role).
--    Le site n'appelle jamais cette table directement (tout passe par worker/src/routes/user-data.js et
--    security-identity.js, qui utilisent SUPABASE_SECRET_KEY). Les politiques « propriétaire » laissaient
--    pourtant n'importe quelle session connectée lire, modifier ou SUPPRIMER sa propre ligne kind='totp'
--    (secret 2FA + codes de secours) via l'API REST de la base, donc contourner la vérification du code
--    TOTP faite par le Worker. On retire les droits ET les politiques : sans droits, RLS refuse tout.
revoke all on table public.ethone_user_data from anon, authenticated;
drop policy if exists ethone_user_data_owner_select on public.ethone_user_data;
drop policy if exists ethone_user_data_owner_insert on public.ethone_user_data;
drop policy if exists ethone_user_data_owner_update on public.ethone_user_data;
drop policy if exists ethone_user_data_owner_delete on public.ethone_user_data;
alter table public.ethone_user_data force row level security;

-- 2. Tables du propriétaire du bot : les droits par défaut donnaient tout (dont TRUNCATE) à anon et authenticated.
--    Seuls les droits réellement utilisés par le site (lecture/insertion du journal, lecture des rôles)
--    sont conservés, et toujours filtrés par les politiques RLS existantes (e-mail du propriétaire).
revoke all on table public.ethone_bot_owner_actions from anon, authenticated;
grant select, insert on table public.ethone_bot_owner_actions to authenticated;
revoke all on table public.ethone_bot_system_roles from anon, authenticated;
grant select on table public.ethone_bot_system_roles to authenticated;

-- 3. Le journal de sécurité ne doit pas pouvoir être modifié ni effacé par l'utilisateur (lecture seule).
revoke update, delete, truncate on table public.ethone_security_events from authenticated;

-- 4. Fonctions : chemin de recherche figé (empêche le détournement par un schéma malveillant).
alter function public.handle_new_user() set search_path = pg_catalog, public;
alter function public.update_last_seen() set search_path = pg_catalog, public;
alter function public.ethone_mail_hour_utc(timestamp with time zone) set search_path = pg_catalog, public;
alter function public.ethone_mail_day_utc(timestamp with time zone) set search_path = pg_catalog, public;

-- 5. Fonctions SECURITY DEFINER réservées aux déclencheurs : plus appelables via /rest/v1/rpc.
--    (Un déclencheur n'a pas besoin du droit EXECUTE de l'appelant au moment où il s'exécute.)
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.update_last_seen() from public, anon, authenticated;
revoke execute on function public.sync_ethone_user_state_active_profile() from public, anon, authenticated;

commit;
