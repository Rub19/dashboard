begin;

-- ============================================================
-- ETHONE Bot Control & Owner Audit System
-- Exclusively grants remote control to rub19.mailpro@gmail.com
-- ============================================================

-- Table d'audit des actions administratives et de contrôle du bot
create table if not exists public.ethone_bot_owner_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text not null,
  action text not null, -- 'RESTART_BOT', 'UPDATE_BOT', 'CLEAR_CACHE', 'TOGGLE_MAINTENANCE'
  status text not null default 'SUCCESS',
  details jsonb not null default '{}'::jsonb,
  ip_address text not null default '',
  created_at timestamptz not null default now(),
  constraint ethone_bot_owner_actions_action_check
    check (action in ('RESTART_BOT', 'UPDATE_BOT', 'CLEAR_CACHE', 'TOGGLE_MAINTENANCE', 'SYNC_CONFIGS'))
);

create index if not exists ethone_bot_owner_actions_email_idx
  on public.ethone_bot_owner_actions (user_email);

create index if not exists ethone_bot_owner_actions_created_at_idx
  on public.ethone_bot_owner_actions (created_at desc);

-- Activation de Row Level Security (RLS)
alter table public.ethone_bot_owner_actions enable row level security;

-- Politiques RLS strictes :
-- Seul l'email officiel de l'owner (rub19.mailpro@gmail.com) peut consulter l'historique
drop policy if exists ethone_bot_owner_actions_select on public.ethone_bot_owner_actions;
create policy ethone_bot_owner_actions_select on public.ethone_bot_owner_actions
  for select
  using (
    lower(auth.jwt() ->> 'email') = 'rub19.mailpro@gmail.com'
  );

-- Seul l'email officiel de l'owner peut insérer un enregistrement d'audit
drop policy if exists ethone_bot_owner_actions_insert on public.ethone_bot_owner_actions;
create policy ethone_bot_owner_actions_insert on public.ethone_bot_owner_actions
  for insert
  with check (
    lower(auth.jwt() ->> 'email') = 'rub19.mailpro@gmail.com'
  );

-- Table des permissions système Bot Owner
create table if not exists public.ethone_bot_system_roles (
  email text primary key,
  role text not null default 'bot_owner',
  discord_user_id text not null default '825124006209388616',
  granted_at timestamptz not null default now()
);

alter table public.ethone_bot_system_roles enable row level security;

drop policy if exists ethone_bot_system_roles_select on public.ethone_bot_system_roles;
create policy ethone_bot_system_roles_select on public.ethone_bot_system_roles
  for select
  using (
    lower(auth.jwt() ->> 'email') = 'rub19.mailpro@gmail.com'
  );

-- Enregistrer rub19.mailpro@gmail.com en tant que Bot Owner suprême
insert into public.ethone_bot_system_roles (email, role, discord_user_id)
values ('rub19.mailpro@gmail.com', 'bot_owner', '825124006209388616')
on conflict (email) do update
set role = 'bot_owner', discord_user_id = '825124006209388616';

commit;
