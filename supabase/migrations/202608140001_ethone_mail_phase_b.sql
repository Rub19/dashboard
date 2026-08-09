begin;

-- Brain analysis cache for messages.
alter table public.ethone_mail_messages
  add column if not exists analyzed_at timestamptz,
  add column if not exists brain_summary text,
  add column if not exists brain_suggested_replies text[] not null default '{}',
  add column if not exists extracted_tasks jsonb not null default '[]',
  add column if not exists extracted_events jsonb not null default '[]';

-- Mail rules for auto-filtering.
create table if not exists public.ethone_mail_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  priority integer not null default 0,
  condition_from text,
  condition_domain text,
  condition_subject text,
  condition_body text,
  condition_has_attachments boolean,
  action_mark_read boolean not null default false,
  action_mark_important boolean not null default false,
  action_mark_spam boolean not null default false,
  action_archive boolean not null default false,
  action_move_to text,
  action_label text,
  action_forward_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_mail_rules_name_length check (char_length(name) <= 80),
  constraint ethone_mail_rules_action_folder check (action_move_to is null or action_move_to in ('inbox', 'starred', 'sent', 'drafts', 'archive', 'spam', 'trash'))
);

create index if not exists ethone_mail_rules_user_idx
  on public.ethone_mail_rules (user_id, priority desc, created_at asc);

-- Notifications for new mail.
create table if not exists public.ethone_mail_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.ethone_mail_messages(id) on delete cascade,
  rule_id uuid references public.ethone_mail_rules(id) on delete set null,
  title text not null,
  body text not null default '',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ethone_mail_notifications_user_idx
  on public.ethone_mail_notifications (user_id, is_read, created_at desc);

create index if not exists ethone_mail_notifications_message_idx
  on public.ethone_mail_notifications (message_id);

-- RLS
alter table public.ethone_mail_rules enable row level security;
alter table public.ethone_mail_rules force row level security;
alter table public.ethone_mail_notifications enable row level security;
alter table public.ethone_mail_notifications force row level security;

drop policy if exists ethone_mail_rules_owner_select on public.ethone_mail_rules;
drop policy if exists ethone_mail_rules_owner_insert on public.ethone_mail_rules;
drop policy if exists ethone_mail_rules_owner_update on public.ethone_mail_rules;
drop policy if exists ethone_mail_rules_owner_delete on public.ethone_mail_rules;

create policy ethone_mail_rules_owner_select on public.ethone_mail_rules for select to authenticated using ((select auth.uid()) = user_id);
create policy ethone_mail_rules_owner_insert on public.ethone_mail_rules for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ethone_mail_rules_owner_update on public.ethone_mail_rules for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ethone_mail_rules_owner_delete on public.ethone_mail_rules for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists ethone_mail_notifications_owner_select on public.ethone_mail_notifications;
drop policy if exists ethone_mail_notifications_owner_insert on public.ethone_mail_notifications;
drop policy if exists ethone_mail_notifications_owner_update on public.ethone_mail_notifications;
drop policy if exists ethone_mail_notifications_owner_delete on public.ethone_mail_notifications;

create policy ethone_mail_notifications_owner_select on public.ethone_mail_notifications for select to authenticated using ((select auth.uid()) = user_id);
create policy ethone_mail_notifications_owner_insert on public.ethone_mail_notifications for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ethone_mail_notifications_owner_update on public.ethone_mail_notifications for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ethone_mail_notifications_owner_delete on public.ethone_mail_notifications for delete to authenticated using ((select auth.uid()) = user_id);

commit;
