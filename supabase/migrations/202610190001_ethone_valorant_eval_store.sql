begin;

-- Matchs Valorant compactés, partagés entre tous les utilisateurs : un match terminé
-- est immuable, il n'est donc récupéré qu'une fois chez HenrikDev. Seul le Worker
-- (clé service) écrit ; les clients connectés lisent.
create table if not exists public.ethone_valorant_matches (
  match_id text primary key,
  started_at timestamptz,
  map text not null default '',
  mode text not null default '',
  puuids text[] not null default '{}',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  constraint ethone_valorant_matches_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint ethone_valorant_matches_id_length check (char_length(match_id) between 8 and 64)
);

create index if not exists ethone_valorant_matches_puuids_idx
  on public.ethone_valorant_matches using gin (puuids);
create index if not exists ethone_valorant_matches_started_idx
  on public.ethone_valorant_matches (started_at desc);

-- Comptes Riot connus + horodatage des synchronisations : c'est ce qui borne les
-- appels HenrikDev (au plus un appel matchs / 10 min et un appel compte / 24 h par joueur).
create table if not exists public.ethone_valorant_accounts (
  puuid text primary key,
  name text not null,
  tag text not null,
  region text not null default 'eu',
  level integer not null default 0,
  card text not null default '',
  title text not null default '',
  tier integer not null default 0,
  -- Rang actuel, pic et saisons (HenrikDev v3 mmr compacté), rafraîchi avec les matchs.
  mmr jsonb not null default '{}'::jsonb,
  account_synced_at timestamptz,
  matches_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint ethone_valorant_accounts_name_length check (char_length(name) between 1 and 32),
  constraint ethone_valorant_accounts_tag_length check (char_length(tag) between 1 and 10)
);

create index if not exists ethone_valorant_accounts_riot_id_idx
  on public.ethone_valorant_accounts (lower(name), lower(tag));

-- Chaque Riot ID vu pour un PUUID (recherche, matchs) : un nouveau couple
-- (puuid, name, tag) = un changement de pseudo détecté à first_seen_at.
create table if not exists public.ethone_valorant_name_history (
  puuid text not null,
  name text not null,
  tag text not null,
  first_seen_at timestamptz not null default now(),
  primary key (puuid, name, tag)
);

create index if not exists ethone_valorant_name_history_seen_idx
  on public.ethone_valorant_name_history (puuid, first_seen_at desc);

alter table public.ethone_valorant_matches enable row level security;
alter table public.ethone_valorant_matches force row level security;
alter table public.ethone_valorant_accounts enable row level security;
alter table public.ethone_valorant_accounts force row level security;
alter table public.ethone_valorant_name_history enable row level security;
alter table public.ethone_valorant_name_history force row level security;

drop policy if exists ethone_valorant_matches_read on public.ethone_valorant_matches;
drop policy if exists ethone_valorant_accounts_read on public.ethone_valorant_accounts;
drop policy if exists ethone_valorant_name_history_read on public.ethone_valorant_name_history;

create policy ethone_valorant_matches_read
  on public.ethone_valorant_matches for select to authenticated using (true);
create policy ethone_valorant_accounts_read
  on public.ethone_valorant_accounts for select to authenticated using (true);
create policy ethone_valorant_name_history_read
  on public.ethone_valorant_name_history for select to authenticated using (true);

revoke all on public.ethone_valorant_matches from anon, authenticated;
revoke all on public.ethone_valorant_accounts from anon, authenticated;
revoke all on public.ethone_valorant_name_history from anon, authenticated;
grant select on public.ethone_valorant_matches to authenticated;
grant select on public.ethone_valorant_accounts to authenticated;
grant select on public.ethone_valorant_name_history to authenticated;

commit;
