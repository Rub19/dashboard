begin;

-- Force RLS for table owners on the few tables that were created after the fail-closed migration.
alter table if exists public.ai_usage_logs force row level security;
alter table if exists public.ethone_items force row level security;

-- Ensure pgcrypto is available for at-rest encryption helpers added later.
-- This is a no-op if the extension is already enabled.
create extension if not exists pgcrypto with schema public;

-- Revoke public/anon execute on any public functions created since the fail-closed migration.
-- Functions intended for authenticated callers must be granted explicitly by their creators.
do $$
declare
  r record;
begin
  for r in
    select n.nspname as schema_name,
           p.proname as function_name,
           pg_get_function_identity_arguments(p.oid) as arguments
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    execute format('revoke execute on function %I.%I(%s) from public', r.schema_name, r.function_name, r.arguments);
    execute format('revoke execute on function %I.%I(%s) from anon', r.schema_name, r.function_name, r.arguments);
  end loop;
end
$$;

commit;
