begin;

create table if not exists public.ethone_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 120),
  type text not null default 'unknown' check (type in ('desktop', 'laptop', 'mobile', 'tablet', 'unknown')),
  platform text not null default '' check (char_length(platform) <= 80),
  browser text not null default '' check (char_length(browser) <= 80),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_verified_at timestamptz,
  trusted boolean not null default false,
  revoked_at timestamptz,
  passkey_enabled boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  session_id text check (char_length(session_id) <= 120),
  constraint ethone_devices_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint ethone_devices_not_revoked_unless_trusted check (revoked_at is null or trusted = true)
);

create index if not exists ethone_devices_user_id_idx on public.ethone_devices(user_id);
create index if not exists ethone_devices_user_revoked_idx on public.ethone_devices(user_id, revoked_at);

alter table public.ethone_devices enable row level security;
alter table public.ethone_devices force row level security;

drop policy if exists ethone_devices_owner_select on public.ethone_devices;
drop policy if exists ethone_devices_owner_insert on public.ethone_devices;
drop policy if exists ethone_devices_owner_update on public.ethone_devices;
drop policy if exists ethone_devices_owner_delete on public.ethone_devices;

create policy ethone_devices_owner_select
  on public.ethone_devices for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_devices_owner_insert
  on public.ethone_devices for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_devices_owner_update
  on public.ethone_devices for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ethone_devices_owner_delete
  on public.ethone_devices for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ethone_devices from anon;
revoke truncate, references, trigger on public.ethone_devices from authenticated;
grant select, insert, update, delete on public.ethone_devices to authenticated;

create table if not exists public.ethone_passkeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.ethone_devices(id) on delete set null,
  credential_id text not null unique check (char_length(credential_id) <= 512),
  public_key text not null check (char_length(public_key) <= 2048),
  sign_count bigint not null default 0 check (sign_count >= 0),
  name text not null default '' check (char_length(name) <= 120),
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  constraint ethone_passkeys_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint ethone_passkeys_not_revoked_last_used check (revoked_at is null or last_used_at is not null)
);

create index if not exists ethone_passkeys_user_id_idx on public.ethone_passkeys(user_id);
create index if not exists ethone_passkeys_user_credential_idx on public.ethone_passkeys(user_id, credential_id);

alter table public.ethone_passkeys enable row level security;
alter table public.ethone_passkeys force row level security;

drop policy if exists ethone_passkeys_owner_select on public.ethone_passkeys;
drop policy if exists ethone_passkeys_owner_insert on public.ethone_passkeys;
drop policy if exists ethone_passkeys_owner_update on public.ethone_passkeys;
drop policy if exists ethone_passkeys_owner_delete on public.ethone_passkeys;

create policy ethone_passkeys_owner_select
  on public.ethone_passkeys for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_passkeys_owner_insert
  on public.ethone_passkeys for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_passkeys_owner_update
  on public.ethone_passkeys for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy ethone_passkeys_owner_delete
  on public.ethone_passkeys for delete to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ethone_passkeys from anon;
revoke truncate, references, trigger on public.ethone_passkeys from authenticated;
grant select, insert, update, delete on public.ethone_passkeys to authenticated;

create table if not exists public.ethone_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (char_length(kind) <= 80),
  device_id uuid references public.ethone_devices(id) on delete set null,
  passkey_id uuid references public.ethone_passkeys(id) on delete set null,
  ip_hash text check (char_length(ip_hash) <= 128),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint ethone_security_events_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint ethone_security_events_no_secret check (
    not (metadata::text ilike '%password%')
    and not (metadata::text ilike '%token%')
    and not (metadata::text ilike '%secret%')
    and not (metadata::text ilike '%otp%')
    and not (metadata::text ilike '%credential%')
  )
);

create index if not exists ethone_security_events_user_id_idx on public.ethone_security_events(user_id);
create index if not exists ethone_security_events_user_created_idx on public.ethone_security_events(user_id, created_at desc);

alter table public.ethone_security_events enable row level security;
alter table public.ethone_security_events force row level security;

drop policy if exists ethone_security_events_owner_select on public.ethone_security_events;
drop policy if exists ethone_security_events_owner_insert on public.ethone_security_events;

create policy ethone_security_events_owner_select
  on public.ethone_security_events for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_security_events_owner_insert
  on public.ethone_security_events for insert to authenticated
  with check ((select auth.uid()) = user_id);

revoke all on public.ethone_security_events from anon;
revoke truncate, references, trigger on public.ethone_security_events from authenticated;
grant select, insert on public.ethone_security_events to authenticated;

create table if not exists public.ethone_device_verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  requesting_device_id uuid references public.ethone_devices(id) on delete cascade,
  approving_device_id uuid references public.ethone_devices(id) on delete set null,
  code text not null check (char_length(code) <= 16),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied', 'expired')),
  constraint ethone_device_verification_requests_code_length check (char_length(code) >= 6)
);

create index if not exists ethone_device_verification_requests_user_id_idx on public.ethone_device_verification_requests(user_id);
create index if not exists ethone_device_verification_requests_user_code_idx on public.ethone_device_verification_requests(user_id, code);
create index if not exists ethone_device_verification_requests_expires_idx on public.ethone_device_verification_requests(expires_at);

alter table public.ethone_device_verification_requests enable row level security;
alter table public.ethone_device_verification_requests force row level security;

drop policy if exists ethone_device_verification_requests_owner_select on public.ethone_device_verification_requests;
drop policy if exists ethone_device_verification_requests_owner_insert on public.ethone_device_verification_requests;
drop policy if exists ethone_device_verification_requests_owner_update on public.ethone_device_verification_requests;

create policy ethone_device_verification_requests_owner_select
  on public.ethone_device_verification_requests for select to authenticated
  using ((select auth.uid()) = user_id);

create policy ethone_device_verification_requests_owner_insert
  on public.ethone_device_verification_requests for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy ethone_device_verification_requests_owner_update
  on public.ethone_device_verification_requests for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.ethone_device_verification_requests from anon;
revoke truncate, references, trigger on public.ethone_device_verification_requests from authenticated;
grant select, insert, update on public.ethone_device_verification_requests to authenticated;

create table if not exists public.ethone_otp_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  contact text not null check (char_length(contact) <= 320),
  code_hash text not null check (char_length(code_hash) <= 256),
  attempts smallint not null default 0 check (attempts >= 0),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  rate_limited_until timestamptz
);

create index if not exists ethone_otp_codes_user_id_idx on public.ethone_otp_codes(user_id);
create index if not exists ethone_otp_codes_user_contact_idx on public.ethone_otp_codes(user_id, contact);
create index if not exists ethone_otp_codes_expires_idx on public.ethone_otp_codes(expires_at);

alter table public.ethone_otp_codes enable row level security;
alter table public.ethone_otp_codes force row level security;

revoke all on public.ethone_otp_codes from anon, authenticated;
revoke truncate, references, trigger on public.ethone_otp_codes from authenticated;

create table if not exists public.ethone_passkey_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  purpose text not null check (purpose in ('registration', 'authentication')),
  challenge text not null check (char_length(challenge) <= 512),
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ethone_passkey_challenges_user_id_idx on public.ethone_passkey_challenges(user_id);
create index if not exists ethone_passkey_challenges_expires_idx on public.ethone_passkey_challenges(expires_at);

alter table public.ethone_passkey_challenges enable row level security;
alter table public.ethone_passkey_challenges force row level security;

revoke all on public.ethone_passkey_challenges from anon, authenticated;
revoke truncate, references, trigger on public.ethone_passkey_challenges from authenticated;

commit;
