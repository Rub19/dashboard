begin;

-- Real login-time TOTP enforcement needs a place to remember "this session
-- was minted for a user who has 2FA enabled, and hasn't presented a valid
-- code yet." ethone_devices already doubles as the app's session table
-- (one row per session_id, see worker/src/services/device-service.js), so
-- a new column here — checked by the same per-request lookup
-- middleware/auth.js already does for session revocation — is enough:
-- no new table, no client-writable surface (RLS on this table is already
-- service-role-only since the 202609090002 migration).
alter table public.ethone_devices
  add column if not exists mfa_pending boolean not null default false;

commit;
