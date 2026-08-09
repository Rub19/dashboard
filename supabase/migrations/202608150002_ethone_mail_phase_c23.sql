begin;

-- Scheduled / outbox queue at worker level for programmés and auto-reply.
create table if not exists public.ethone_mail_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.ethone_mail_messages(id) on delete set null,
  kind text not null check (kind in ('scheduled', 'auto_reply', 'forward')),
  payload jsonb not null default '{}',
  scheduled_at timestamptz,
  sent_at timestamptz,
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ethone_mail_outbox_pending_idx
  on public.ethone_mail_outbox (scheduled_at, attempts, created_at)
  where sent_at is null;

-- Add snoozed folder to allowed check manually if needed; we rely on snoozed_until column.
-- Ensure snoozed_until is already added by C1 migration.

-- Add column for auto-reply sent tracking.
alter table public.ethone_mail_messages
  add column if not exists auto_reply_sent boolean not null default false;

-- RLS
alter table public.ethone_mail_outbox enable row level security;
alter table public.ethone_mail_outbox force row level security;

drop policy if exists ethone_mail_outbox_owner_select on public.ethone_mail_outbox;
drop policy if exists ethone_mail_outbox_owner_insert on public.ethone_mail_outbox;

create policy ethone_mail_outbox_owner_select on public.ethone_mail_outbox for select to authenticated using ((select auth.uid()) = user_id);
create policy ethone_mail_outbox_owner_insert on public.ethone_mail_outbox for insert to authenticated with check ((select auth.uid()) = user_id);

commit;
