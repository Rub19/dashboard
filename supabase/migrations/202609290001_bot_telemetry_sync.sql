-- ============================================================
-- Synchronisation de la télémétrie du bot (Centre de contrôle)
-- Le bot écrit ici via sa clé service_role (contourne RLS) ; seul le
-- propriétaire peut lire (RLS), donc l'accès est vérifié par la base
-- de données elle-même plutôt que par un check isOwner côté React
-- répété (et parfois oublié) dans chaque composant.
-- ============================================================

begin;

create table if not exists public.ethone_bot_telemetry (
  id text primary key default 'global',
  status jsonb not null default '{}'::jsonb,   -- { online, uptimeSeconds, pingMs, version, guildCount, userCount, shardsCount }
  servers jsonb not null default '[]'::jsonb,  -- [{ id, name, icon, memberCount }]
  presence jsonb not null default '{}'::jsonb, -- { status, activity: { type, name, state } }
  subsystems jsonb not null default '[]'::jsonb, -- [{ id, name, status }]
  updated_at timestamptz not null default now()
);

alter table public.ethone_bot_telemetry enable row level security;

-- Seul l'owner peut lire (même politique que ethone_bot_owner_actions / ethone_bot_system_roles).
-- Pas de policy insert/update : le bot écrit avec la clé service_role, qui contourne RLS.
drop policy if exists ethone_bot_telemetry_select on public.ethone_bot_telemetry;
create policy ethone_bot_telemetry_select on public.ethone_bot_telemetry
  for select
  using (
    lower(auth.jwt() ->> 'email') = 'rub19.mailpro@gmail.com'
  );

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ethone_bot_telemetry'
  ) then
    alter publication supabase_realtime add table public.ethone_bot_telemetry;
  end if;
end $$;

alter table public.ethone_bot_telemetry replica identity full;

insert into public.ethone_bot_telemetry (id) values ('global')
on conflict (id) do nothing;

commit;
