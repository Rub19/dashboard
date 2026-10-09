-- Redirections d'adresses ETHONE (@ethone.dev) vers des boîtes externes (Gmail, iCloud…).
-- Une redirection ne s'active qu'après confirmation d'un code envoyé à l'adresse de destination : la personne prouve
-- qu'elle possède les deux boîtes. Table réservée au Worker (clé de service) : RLS activée sans aucune règle, pour que
-- l'empreinte du code ne soit jamais lisible depuis le navigateur.
create table if not exists public.ethone_mail_forwards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- null = toutes les adresses ETHONE du compte
  alias_id uuid references public.ethone_mail_aliases (id) on delete cascade,
  destination text not null check (destination ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' and length(destination) <= 320),
  verified_at timestamptz,
  is_active boolean not null default true,
  code_hash text,
  code_expires_at timestamptz,
  attempts integer not null default 0,
  last_sent_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists ethone_mail_forwards_unique
  on public.ethone_mail_forwards (user_id, lower(destination), coalesce(alias_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists ethone_mail_forwards_user on public.ethone_mail_forwards (user_id);

alter table public.ethone_mail_forwards enable row level security;
