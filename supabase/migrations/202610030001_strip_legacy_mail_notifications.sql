-- Anciennes notifications « Nouveau mail » (source ETHONE Mail, identifiant généré au lieu de « mail-<id serveur> ») :
-- les versions du dashboard d'avant la v1.52.6 en recréaient une à chaque chargement / renouvellement de session.
-- Un appareil resté sur cette ancienne version continuait d'en réécrire dans ethone_user_state : on les retire à
-- chaque écriture, d'où qu'elle vienne. Les notifications de mail actuelles (id « mail-… ») ne sont pas touchées.
create or replace function public.ethone_strip_legacy_mail_notifications()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.payload ? 'notifications' and jsonb_typeof(new.payload -> 'notifications') = 'array' then
    new.payload := jsonb_set(
      new.payload,
      '{notifications}',
      coalesce(
        (
          select jsonb_agg(item order by position)
          from jsonb_array_elements(new.payload -> 'notifications') with ordinality as t(item, position)
          where not (item ->> 'source' = 'ETHONE Mail' and coalesce(item ->> 'id', '') not like 'mail-%')
        ),
        '[]'::jsonb
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists ethone_strip_legacy_mail_notifications on public.ethone_user_state;
create trigger ethone_strip_legacy_mail_notifications
  before insert or update on public.ethone_user_state
  for each row execute function public.ethone_strip_legacy_mail_notifications();

-- Nettoyage des lignes existantes (le déclencheur s'applique à cette mise à jour).
update public.ethone_user_state set payload = payload where payload ? 'notifications';
