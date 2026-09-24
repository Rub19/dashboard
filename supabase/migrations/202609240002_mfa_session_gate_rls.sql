-- Verrou 2FA au niveau base : un compte qui a activé le TOTP ne peut lire/écrire ses tables de données (via PostgREST,
-- donc avec un simple JWT obtenu par mot de passe) que si la SESSION du JWT est enregistrée et n'est plus « mfa_pending ».
-- Avant : ce contrôle n'existait que dans le Worker, contournable en appelant PostgREST directement.
--
-- NON APPLIQUÉE automatiquement (refusée par le garde-fou de la session). À appliquer par le propriétaire du projet
-- (SQL editor Supabase ou MCP) après relecture. Aucun compte n'a le TOTP activé au 2026-09-24 : effet immédiat nul,
-- protection effective dès la première activation.
--
-- Effet de bord à connaître : entre la connexion et l'enregistrement de la session par le Worker (deviceUpsertRoute),
-- un compte TOTP obtient des réponses vides sur ces tables ; une fois le code TOTP saisi, les données réapparaissent
-- (le front doit recharger après la validation du code).
create or replace function public.ethone_mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when auth.uid() is null then true
    when not exists (
      select 1 from public.ethone_user_data d
      where d.user_id = auth.uid() and d.kind = 'totp' and d.data->>'verified' = 'true'
    ) then true
    else exists (
      select 1 from public.ethone_devices v
      where v.user_id = auth.uid()
        and v.session_id = (auth.jwt()->>'session_id')
        and v.revoked_at is null
        and v.mfa_pending = false
    )
  end
$$;

revoke all on function public.ethone_mfa_ok() from public, anon;
grant execute on function public.ethone_mfa_ok() to authenticated;

do $$
declare
  t text;
  skip text[] := array[
    'ethone_devices', 'ethone_security_events', 'ethone_bot_owner_actions', 'ethone_bot_system_roles',
    'ai_usage_logs', 'profiles', 'ethone_profiles', 'ethone_user_data', 'ethone_otp_codes',
    'ethone_passkey_challenges', 'user_oauth_tokens', 'ethone_identity_assets'
  ];
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and exists (select 1 from pg_policy p where p.polrelid = c.oid)
      and c.relname <> all (skip)
  loop
    execute format('drop policy if exists ethone_mfa_gate on public.%I', t);
    execute format(
      'create policy ethone_mfa_gate on public.%I as restrictive for all to authenticated using ((select public.ethone_mfa_ok())) with check ((select public.ethone_mfa_ok()))',
      t
    );
  end loop;
end $$;
