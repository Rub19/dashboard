begin;

create table if not exists public.ethone_brain_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('interface','habits','widgets','schedules','task-types','spaces','flows','response-style','goals')),
  memory_key text not null check (char_length(memory_key) between 1 and 80),
  memory_value text not null check (char_length(memory_value) between 1 and 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '90 days'),
  constraint ethone_brain_memories_no_secret_keys check (memory_key !~* '(password|passcode|token|secret|api.?key|authorization|credential|cookie|private.?key)'),
  constraint ethone_brain_memories_no_secret_values check (memory_value !~* '(bearer[[:space:]]+[a-z0-9._~-]{12,}|(sk|pat|ghp|glpat|xox[baprs])[-_a-z0-9]{12,}|begin[[:space:]][a-z[:space:]]+private[[:space:]]+key)')
);

create index if not exists ethone_brain_memories_owner_updated_idx
  on public.ethone_brain_memories (user_id, updated_at desc);

create unique index if not exists ethone_brain_memories_owner_category_key_idx
  on public.ethone_brain_memories (user_id, category, memory_key);

create index if not exists ethone_brain_memories_expiry_idx
  on public.ethone_brain_memories (expires_at);

alter table public.ethone_brain_memories enable row level security;
alter table public.ethone_brain_memories force row level security;

drop policy if exists ethone_brain_memories_owner_select on public.ethone_brain_memories;
drop policy if exists ethone_brain_memories_owner_insert on public.ethone_brain_memories;
drop policy if exists ethone_brain_memories_owner_update on public.ethone_brain_memories;
drop policy if exists ethone_brain_memories_owner_delete on public.ethone_brain_memories;

create policy ethone_brain_memories_owner_select
  on public.ethone_brain_memories for select to authenticated
  using ((select auth.uid()) = user_id and expires_at > now());

create policy ethone_brain_memories_owner_insert
  on public.ethone_brain_memories for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_brain_memories_owner_update
  on public.ethone_brain_memories for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ethone_brain_memories_owner_delete
  on public.ethone_brain_memories for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ethone_brain_memories from anon;
revoke truncate, references, trigger on public.ethone_brain_memories from authenticated;
grant select, insert, update, delete on public.ethone_brain_memories to authenticated;

commit;
