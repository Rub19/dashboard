begin;

-- Part of "Session & Account Security 2.0", Phase 3 (TOTP / 2FA fixes).
--
-- worker/src/routes/security-identity.js's totpSetupRoute (and its
-- verify/disable siblings) store the TOTP secret, verified flag, and hashed
-- backup codes as a single ethone_user_data row with kind='totp'. That code
-- path predates this migration but ethone_user_data_kind_check (last
-- redefined by 202609090001_ethone_user_data_kinds_restore_discord.sql) never
-- included 'totp' in its allowlist — so every insert/update the TOTP routes
-- make has always been rejected by Postgres with a 23514 check_violation,
-- independently of the application-level bugs fixed alongside this migration
-- (missing import, hashed-then-reused secret, non-crypto backup codes, and
-- the setup-verify PATCH that was actually a conflicting POST). Fixing the
-- application code alone is not sufficient without this constraint change.
--
-- This migration adds 'totp' to the same allowlist, following the same
-- drop-and-recreate pattern as every prior kind addition to this constraint.
alter table public.ethone_user_data
  drop constraint if exists ethone_user_data_kind_check;

alter table public.ethone_user_data
  add constraint ethone_user_data_kind_check
  check (kind in ('space', 'flow', 'interaction', 'macro', 'persona', 'bill', 'plugin', 'discord', 'totp'));

commit;
