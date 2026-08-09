begin;

-- E.1 External mail accounts (Gmail, Outlook, IMAP)
create table if not exists public.ethone_mail_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null, -- gmail, outlook, imap
  label text not null default '',
  email text not null,
  imap_host text,
  imap_port integer,
  imap_username text,
  imap_password_encrypted text,
  smtp_host text,
  smtp_port integer,
  smtp_username text,
  smtp_password_encrypted text,
  oauth_provider text,
  oauth_tokens jsonb not null default '{}',
  last_sync_at timestamptz,
  sync_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_mail_accounts_provider check (provider in ('gmail', 'outlook', 'imap')),
  constraint ethone_mail_accounts_email_length check (char_length(email) <= 320)
);

create unique index if not exists ethone_mail_accounts_user_email_idx
  on public.ethone_mail_accounts (user_id, lower(email));

create index if not exists ethone_mail_accounts_user_idx
  on public.ethone_mail_accounts (user_id, provider);

-- E.2 PGP public keys for end-to-end message encryption
create table if not exists public.ethone_mail_pgp_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  fingerprint text not null,
  public_key text not null,
  private_key_encrypted text not null default '',
  passphrase_hash text,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_mail_pgp_keys_email_length check (char_length(email) <= 320)
);

create unique index if not exists ethone_mail_pgp_keys_user_email_idx
  on public.ethone_mail_pgp_keys (user_id, lower(email));

create unique index if not exists ethone_mail_pgp_keys_user_default_idx
  on public.ethone_mail_pgp_keys (user_id) where is_default = true;

-- E.3 Push notification subscriptions
create table if not exists public.ethone_mail_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists ethone_mail_push_subscriptions_endpoint_idx
  on public.ethone_mail_push_subscriptions (endpoint);

create index if not exists ethone_mail_push_subscriptions_user_idx
  on public.ethone_mail_push_subscriptions (user_id);

-- E.4 Mailing lists and members
create table if not exists public.ethone_mail_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alias_address text not null,
  name text not null default '',
  description text not null default '',
  is_public boolean not null default false,
  reply_to_list boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_mail_lists_alias_length check (char_length(alias_address) <= 320)
);

create unique index if not exists ethone_mail_lists_user_alias_idx
  on public.ethone_mail_lists (user_id, lower(alias_address));

create table if not exists public.ethone_mail_list_members (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.ethone_mail_lists(id) on delete cascade,
  email text not null,
  name text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_mail_list_members_email_length check (char_length(email) <= 320)
);

create unique index if not exists ethone_mail_list_members_list_email_idx
  on public.ethone_mail_list_members (list_id, lower(email));

create index if not exists ethone_mail_list_members_list_idx
  on public.ethone_mail_list_members (list_id);

-- RLS
alter table public.ethone_mail_accounts enable row level security;
alter table public.ethone_mail_accounts force row level security;
alter table public.ethone_mail_pgp_keys enable row level security;
alter table public.ethone_mail_pgp_keys force row level security;
alter table public.ethone_mail_push_subscriptions enable row level security;
alter table public.ethone_mail_push_subscriptions force row level security;
alter table public.ethone_mail_lists enable row level security;
alter table public.ethone_mail_lists force row level security;
alter table public.ethone_mail_list_members enable row level security;
alter table public.ethone_mail_list_members force row level security;

-- Owner policies

drop policy if exists ethone_mail_accounts_owner_select on public.ethone_mail_accounts;
create policy ethone_mail_accounts_owner_select on public.ethone_mail_accounts for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_accounts_owner_insert on public.ethone_mail_accounts;
create policy ethone_mail_accounts_owner_insert on public.ethone_mail_accounts for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_accounts_owner_update on public.ethone_mail_accounts;
create policy ethone_mail_accounts_owner_update on public.ethone_mail_accounts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_accounts_owner_delete on public.ethone_mail_accounts;
create policy ethone_mail_accounts_owner_delete on public.ethone_mail_accounts for delete to authenticated using ((select auth.uid()) = user_id);


drop policy if exists ethone_mail_pgp_keys_owner_select on public.ethone_mail_pgp_keys;
create policy ethone_mail_pgp_keys_owner_select on public.ethone_mail_pgp_keys for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_pgp_keys_owner_insert on public.ethone_mail_pgp_keys;
create policy ethone_mail_pgp_keys_owner_insert on public.ethone_mail_pgp_keys for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_pgp_keys_owner_update on public.ethone_mail_pgp_keys;
create policy ethone_mail_pgp_keys_owner_update on public.ethone_mail_pgp_keys for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_pgp_keys_owner_delete on public.ethone_mail_pgp_keys;
create policy ethone_mail_pgp_keys_owner_delete on public.ethone_mail_pgp_keys for delete to authenticated using ((select auth.uid()) = user_id);


drop policy if exists ethone_mail_push_subscriptions_owner_select on public.ethone_mail_push_subscriptions;
create policy ethone_mail_push_subscriptions_owner_select on public.ethone_mail_push_subscriptions for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_push_subscriptions_owner_insert on public.ethone_mail_push_subscriptions;
create policy ethone_mail_push_subscriptions_owner_insert on public.ethone_mail_push_subscriptions for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_push_subscriptions_owner_delete on public.ethone_mail_push_subscriptions;
create policy ethone_mail_push_subscriptions_owner_delete on public.ethone_mail_push_subscriptions for delete to authenticated using ((select auth.uid()) = user_id);


drop policy if exists ethone_mail_lists_owner_select on public.ethone_mail_lists;
create policy ethone_mail_lists_owner_select on public.ethone_mail_lists for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_lists_owner_insert on public.ethone_mail_lists;
create policy ethone_mail_lists_owner_insert on public.ethone_mail_lists for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_lists_owner_update on public.ethone_mail_lists;
create policy ethone_mail_lists_owner_update on public.ethone_mail_lists for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_lists_owner_delete on public.ethone_mail_lists;
create policy ethone_mail_lists_owner_delete on public.ethone_mail_lists for delete to authenticated using ((select auth.uid()) = user_id);


drop policy if exists ethone_mail_list_members_owner_select on public.ethone_mail_list_members;
create policy ethone_mail_list_members_owner_select on public.ethone_mail_list_members for select to authenticated using ((select auth.uid()) = (select user_id from public.ethone_mail_lists where id = list_id));
drop policy if exists ethone_mail_list_members_owner_insert on public.ethone_mail_list_members;
create policy ethone_mail_list_members_owner_insert on public.ethone_mail_list_members for insert to authenticated with check ((select auth.uid()) = (select user_id from public.ethone_mail_lists where id = list_id));
drop policy if exists ethone_mail_list_members_owner_update on public.ethone_mail_list_members;
create policy ethone_mail_list_members_owner_update on public.ethone_mail_list_members for update to authenticated using ((select auth.uid()) = (select user_id from public.ethone_mail_lists where id = list_id)) with check ((select auth.uid()) = (select user_id from public.ethone_mail_lists where id = list_id));
drop policy if exists ethone_mail_list_members_owner_delete on public.ethone_mail_list_members;
create policy ethone_mail_list_members_owner_delete on public.ethone_mail_list_members for delete to authenticated using ((select auth.uid()) = (select user_id from public.ethone_mail_lists where id = list_id));

-- Add optional account_id to messages for external sync
drop type if exists public.ethone_mail_provider;

create type public.ethone_mail_provider as enum ('ethone', 'gmail', 'outlook', 'imap');

alter table public.ethone_mail_messages
  add column if not exists account_id uuid references public.ethone_mail_accounts(id) on delete set null,
  add column if not exists is_encrypted boolean not null default false,
  add column if not exists list_id uuid references public.ethone_mail_lists(id) on delete set null;

create index if not exists ethone_mail_messages_account_idx
  on public.ethone_mail_messages (account_id, received_at desc);

create index if not exists ethone_mail_messages_list_idx
  on public.ethone_mail_messages (list_id, received_at desc);

commit;