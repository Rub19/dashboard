begin;

-- D.1 Analytics
alter table public.ethone_mail_messages
  add column if not exists message_size integer not null default 0,
  add column if not exists received_hour integer generated always as (extract(hour from received_at)) stored,
  add column if not exists received_day text generated always as (to_char(received_at, 'YYYY-MM-DD')) stored,
  add column if not exists auth_results jsonb not null default '{}';

create index if not exists ethone_mail_messages_analytics_idx
  on public.ethone_mail_messages (user_id, received_at, direction, folder, is_read);

create index if not exists ethone_mail_messages_hour_idx
  on public.ethone_mail_messages (user_id, received_hour, received_day);

-- D.2 Security / trust
-- D.2 uses existing source_ip column added in C.23; add auth_results above.

create table if not exists public.ethone_mail_blocked_senders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  domain text,
  reason text not null default 'manual',
  created_at timestamptz not null default now(),
  constraint blocked_email_or_domain check (email is not null or domain is not null)
);

create table if not exists public.ethone_mail_trusted_senders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  domain text,
  created_at timestamptz not null default now(),
  constraint trusted_email_or_domain check (email is not null or domain is not null)
);

create index if not exists ethone_mail_blocked_senders_user_idx
  on public.ethone_mail_blocked_senders (user_id, email, domain);

create index if not exists ethone_mail_trusted_senders_user_idx
  on public.ethone_mail_trusted_senders (user_id, email, domain);

-- RLS
alter table public.ethone_mail_blocked_senders enable row level security;
alter table public.ethone_mail_blocked_senders force row level security;
alter table public.ethone_mail_trusted_senders enable row level security;
alter table public.ethone_mail_trusted_senders force row level security;

drop policy if exists ethone_mail_blocked_owner_select on public.ethone_mail_blocked_senders;
drop policy if exists ethone_mail_blocked_owner_insert on public.ethone_mail_blocked_senders;
drop policy if exists ethone_mail_blocked_owner_delete on public.ethone_mail_blocked_senders;

create policy ethone_mail_blocked_owner_select on public.ethone_mail_blocked_senders for select to authenticated using ((select auth.uid()) = user_id);
create policy ethone_mail_blocked_owner_insert on public.ethone_mail_blocked_senders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ethone_mail_blocked_owner_delete on public.ethone_mail_blocked_senders for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists ethone_mail_trusted_owner_select on public.ethone_mail_trusted_senders;
drop policy if exists ethone_mail_trusted_owner_insert on public.ethone_mail_trusted_senders;
drop policy if exists ethone_mail_trusted_owner_delete on public.ethone_mail_trusted_senders;

create policy ethone_mail_trusted_owner_select on public.ethone_mail_trusted_senders for select to authenticated using ((select auth.uid()) = user_id);
create policy ethone_mail_trusted_owner_insert on public.ethone_mail_trusted_senders for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ethone_mail_trusted_owner_delete on public.ethone_mail_trusted_senders for delete to authenticated using ((select auth.uid()) = user_id);

commit;
