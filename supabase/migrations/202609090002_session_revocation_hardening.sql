begin;

-- Part of "Session & Account Security 2.0", Phase 1 (real session revocation).
--
-- 1. ethone_devices_not_revoked_unless_trusted was backwards against the
--    feature it was meant to support: it forbade `revoked_at is not null AND
--    trusted = false` — but device-service.js's revokeDevice() sets exactly
--    that combination (`{ revokedAt: now(), trusted: false }`) on every call.
--    Revoking a device is precisely the "this is no longer trusted, and it's
--    revoked" case; the constraint made that write fail every time. Dropped.
alter table public.ethone_devices
  drop constraint if exists ethone_devices_not_revoked_unless_trusted;

-- 2. ethone_devices and ethone_security_events are read by the client
--    directly (used by useSecurity.ts's GET calls), but every WRITE already
--    goes exclusively through the Worker's routes, which run as service_role
--    and bypass RLS/grants entirely. The `for update`/`for insert` policies
--    below therefore only ever mattered for one thing: letting a browser
--    talk to PostgREST directly and bypass the Worker's logic altogether —
--    e.g. self-marking a revoked device `trusted = true` again, or
--    self-un-revoking it (ethone_devices), or forging arbitrary entries in
--    one's own security audit log, including fake `session_id`s/kinds
--    (ethone_security_events). Both become read-only to authenticated
--    clients; the Worker (service_role) is unaffected since RLS/GRANT never
--    applied to it in the first place.
drop policy if exists ethone_devices_owner_insert on public.ethone_devices;
drop policy if exists ethone_devices_owner_update on public.ethone_devices;
drop policy if exists ethone_devices_owner_delete on public.ethone_devices;
revoke insert, update, delete on public.ethone_devices from authenticated;

drop policy if exists ethone_security_events_owner_insert on public.ethone_security_events;
revoke insert on public.ethone_security_events from authenticated;

commit;
