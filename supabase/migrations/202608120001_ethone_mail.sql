begin;

-- Mail aliases for ETHONE users.
create table if not exists public.ethone_mail_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alias text not null unique,
  display_name text not null default '',
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_mail_aliases_alias_format check (
    alias ~ '^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}@[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
  ),
  constraint ethone_mail_aliases_display_name_length check (char_length(display_name) <= 80)
);

create unique index if not exists ethone_mail_aliases_user_primary_idx
  on public.ethone_mail_aliases (user_id) where is_primary = true;

create index if not exists ethone_mail_aliases_alias_idx
  on public.ethone_mail_aliases (alias);

-- Received and sent mail messages.
create table if not exists public.ethone_mail_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  alias_id uuid references public.ethone_mail_aliases(id) on delete set null,
  direction text not null default 'inbound' check (direction in ('inbound', 'outbound')),
  thread_id uuid,
  from_address text not null,
  from_name text not null default '',
  to_addresses text[] not null,
  cc_addresses text[] not null default '{}',
  bcc_addresses text[] not null default '{}',
  reply_to text,
  subject text not null default '',
  body_text text not null default '',
  body_html text not null default '',
  headers jsonb,
  is_read boolean not null default false,
  is_spam boolean not null default false,
  sent_at timestamptz,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint ethone_mail_messages_direction check (direction in ('inbound', 'outbound'))
);

create index if not exists ethone_mail_messages_user_direction_idx
  on public.ethone_mail_messages (user_id, direction, received_at desc);

create index if not exists ethone_mail_messages_thread_idx
  on public.ethone_mail_messages (thread_id, received_at desc);

create index if not exists ethone_mail_messages_alias_idx
  on public.ethone_mail_messages (alias_id, received_at desc);

-- Threads for conversations.
create table if not exists public.ethone_mail_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subject text not null default '',
  participants text[] not null default '{}',
  message_count integer not null default 0,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ethone_mail_threads_user_idx
  on public.ethone_mail_threads (user_id, last_message_at desc);

-- RLS
alter table public.ethone_mail_aliases enable row level security;
alter table public.ethone_mail_aliases force row level security;
alter table public.ethone_mail_messages enable row level security;
alter table public.ethone_mail_messages force row level security;
alter table public.ethone_mail_threads enable row level security;
alter table public.ethone_mail_threads force row level security;

drop policy if exists ethone_mail_aliases_owner_select on public.ethone_mail_aliases;
drop policy if exists ethone_mail_aliases_owner_insert on public.ethone_mail_aliases;
drop policy if exists ethone_mail_aliases_owner_update on public.ethone_mail_aliases;
drop policy if exists ethone_mail_aliases_owner_delete on public.ethone_mail_aliases;

create policy ethone_mail_aliases_owner_select
  on public.ethone_mail_aliases for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_mail_aliases_owner_insert
  on public.ethone_mail_aliases for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_mail_aliases_owner_update
  on public.ethone_mail_aliases for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ethone_mail_aliases_owner_delete
  on public.ethone_mail_aliases for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists ethone_mail_messages_owner_select on public.ethone_mail_messages;
drop policy if exists ethone_mail_messages_owner_insert on public.ethone_mail_messages;
drop policy if exists ethone_mail_messages_owner_update on public.ethone_mail_messages;
drop policy if exists ethone_mail_messages_owner_delete on public.ethone_mail_messages;

create policy ethone_mail_messages_owner_select
  on public.ethone_mail_messages for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_mail_messages_owner_insert
  on public.ethone_mail_messages for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_mail_messages_owner_update
  on public.ethone_mail_messages for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ethone_mail_messages_owner_delete
  on public.ethone_mail_messages for delete to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists ethone_mail_threads_owner_select on public.ethone_mail_threads;
drop policy if exists ethone_mail_threads_owner_insert on public.ethone_mail_threads;
drop policy if exists ethone_mail_threads_owner_update on public.ethone_mail_threads;
drop policy if exists ethone_mail_threads_owner_delete on public.ethone_mail_threads;

create policy ethone_mail_threads_owner_select
  on public.ethone_mail_threads for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_mail_threads_owner_insert
  on public.ethone_mail_threads for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_mail_threads_owner_update
  on public.ethone_mail_threads for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ethone_mail_threads_owner_delete
  on public.ethone_mail_threads for delete to authenticated
  using ((select auth.uid()) = user_id);

commit;
