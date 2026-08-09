begin;

-- Extend mail messages with folders, flags, labels and search.
alter table public.ethone_mail_messages
  add column if not exists folder text not null default 'inbox',
  add column if not exists is_starred boolean not null default false,
  add column if not exists is_important boolean not null default false,
  add column if not exists labels text[] not null default '{}',
  add column if not exists deleted_at timestamptz,
  add column if not exists status text not null default 'received',
  add column if not exists raw_size integer,
  add column if not exists attachments jsonb not null default '[]',
  add column if not exists search_vector tsvector generated always as (
    to_tsvector('french',
      coalesce(from_name, '') || ' ' ||
      coalesce(from_address, '') || ' ' ||
      coalesce(subject, '') || ' ' ||
      coalesce(body_text, '')
    )
  ) stored;

-- Backfill folder and status from existing direction.
update public.ethone_mail_messages set folder = 'sent', status = 'sent' where direction = 'outbound';
update public.ethone_mail_messages set folder = 'inbox', status = 'received' where direction = 'inbound';

alter table public.ethone_mail_messages
  add constraint ethone_mail_messages_folder check (folder in ('inbox', 'sent', 'drafts', 'archive', 'spam', 'trash')),
  add constraint ethone_mail_messages_status check (status in ('received', 'draft', 'sent', 'scheduled'));

create index if not exists ethone_mail_messages_user_folder_idx
  on public.ethone_mail_messages (user_id, folder, received_at desc);

create index if not exists ethone_mail_messages_search_idx
  on public.ethone_mail_messages using gin (search_vector);

-- Labels (user-defined tags for messages).
create table if not exists public.ethone_mail_labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#7dd3fc',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_mail_labels_name_length check (char_length(name) <= 40)
);

create unique index if not exists ethone_mail_labels_user_name_idx
  on public.ethone_mail_labels (user_id, lower(name));

-- Signatures for compose.
create table if not exists public.ethone_mail_signatures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  content text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_mail_signatures_name_length check (char_length(name) <= 40),
  constraint ethone_mail_signatures_content_length check (char_length(content) <= 4000)
);

create unique index if not exists ethone_mail_signatures_user_default_idx
  on public.ethone_mail_signatures (user_id) where is_default = true;

-- Contacts extracted from sender/recipient interactions.
create table if not exists public.ethone_mail_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  frequency integer not null default 0,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ethone_mail_contacts_email_length check (char_length(email) <= 320)
);

create unique index if not exists ethone_mail_contacts_user_email_idx
  on public.ethone_mail_contacts (user_id, lower(email));

-- Attachments metadata for messages.
create table if not exists public.ethone_mail_attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid references public.ethone_mail_messages(id) on delete cascade,
  filename text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes integer not null default 0,
  storage_path text,
  created_at timestamptz not null default now(),
  constraint ethone_mail_attachments_filename_length check (char_length(filename) <= 255)
);

create index if not exists ethone_mail_attachments_message_idx
  on public.ethone_mail_attachments (message_id);

-- RLS for new tables.
alter table public.ethone_mail_labels enable row level security;
alter table public.ethone_mail_labels force row level security;
alter table public.ethone_mail_signatures enable row level security;
alter table public.ethone_mail_signatures force row level security;
alter table public.ethone_mail_contacts enable row level security;
alter table public.ethone_mail_contacts force row level security;
alter table public.ethone_mail_attachments enable row level security;
alter table public.ethone_mail_attachments force row level security;

drop policy if exists ethone_mail_labels_owner_select on public.ethone_mail_labels;
drop policy if exists ethone_mail_labels_owner_insert on public.ethone_mail_labels;
drop policy if exists ethone_mail_labels_owner_update on public.ethone_mail_labels;
drop policy if exists ethone_mail_labels_owner_delete on public.ethone_mail_labels;

create policy ethone_mail_labels_owner_select on public.ethone_mail_labels for select to authenticated using ((select auth.uid()) = user_id);
create policy ethone_mail_labels_owner_insert on public.ethone_mail_labels for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ethone_mail_labels_owner_update on public.ethone_mail_labels for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ethone_mail_labels_owner_delete on public.ethone_mail_labels for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists ethone_mail_signatures_owner_select on public.ethone_mail_signatures;
drop policy if exists ethone_mail_signatures_owner_insert on public.ethone_mail_signatures;
drop policy if exists ethone_mail_signatures_owner_update on public.ethone_mail_signatures;
drop policy if exists ethone_mail_signatures_owner_delete on public.ethone_mail_signatures;

create policy ethone_mail_signatures_owner_select on public.ethone_mail_signatures for select to authenticated using ((select auth.uid()) = user_id);
create policy ethone_mail_signatures_owner_insert on public.ethone_mail_signatures for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ethone_mail_signatures_owner_update on public.ethone_mail_signatures for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ethone_mail_signatures_owner_delete on public.ethone_mail_signatures for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists ethone_mail_contacts_owner_select on public.ethone_mail_contacts;
drop policy if exists ethone_mail_contacts_owner_insert on public.ethone_mail_contacts;
drop policy if exists ethone_mail_contacts_owner_update on public.ethone_mail_contacts;
drop policy if exists ethone_mail_contacts_owner_delete on public.ethone_mail_contacts;

create policy ethone_mail_contacts_owner_select on public.ethone_mail_contacts for select to authenticated using ((select auth.uid()) = user_id);
create policy ethone_mail_contacts_owner_insert on public.ethone_mail_contacts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ethone_mail_contacts_owner_update on public.ethone_mail_contacts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ethone_mail_contacts_owner_delete on public.ethone_mail_contacts for delete to authenticated using ((select auth.uid()) = user_id);

drop policy if exists ethone_mail_attachments_owner_select on public.ethone_mail_attachments;
drop policy if exists ethone_mail_attachments_owner_insert on public.ethone_mail_attachments;
drop policy if exists ethone_mail_attachments_owner_update on public.ethone_mail_attachments;
drop policy if exists ethone_mail_attachments_owner_delete on public.ethone_mail_attachments;

create policy ethone_mail_attachments_owner_select on public.ethone_mail_attachments for select to authenticated using ((select auth.uid()) = user_id);
create policy ethone_mail_attachments_owner_insert on public.ethone_mail_attachments for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ethone_mail_attachments_owner_update on public.ethone_mail_attachments for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ethone_mail_attachments_owner_delete on public.ethone_mail_attachments for delete to authenticated using ((select auth.uid()) = user_id);

commit;
