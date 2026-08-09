begin;

-- Templates de réponse.
create table if not exists public.ethone_mail_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  subject text not null default '',
  content text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_mail_templates_name_length check (char_length(name) <= 80)
);

create index if not exists ethone_mail_templates_user_idx
  on public.ethone_mail_templates (user_id, is_default, created_at desc);

-- Colonnes utiles aussi pour les phases C.2 et C.3.
alter table public.ethone_mail_messages
  add column if not exists snoozed_until timestamptz,
  add column if not exists scheduled_at timestamptz,
  add column if not exists source_ip text;

alter table public.ethone_mail_rules
  add column if not exists auto_reply text;

-- RLS
alter table public.ethone_mail_templates enable row level security;
alter table public.ethone_mail_templates force row level security;


drop policy if exists ethone_mail_templates_owner_select on public.ethone_mail_templates;
create policy ethone_mail_templates_owner_select on public.ethone_mail_templates for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_templates_owner_insert on public.ethone_mail_templates;
create policy ethone_mail_templates_owner_insert on public.ethone_mail_templates for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_templates_owner_update on public.ethone_mail_templates;
create policy ethone_mail_templates_owner_update on public.ethone_mail_templates for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists ethone_mail_templates_owner_delete on public.ethone_mail_templates;
create policy ethone_mail_templates_owner_delete on public.ethone_mail_templates for delete to authenticated using ((select auth.uid()) = user_id);

commit;