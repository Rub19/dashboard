begin;

-- Public is an exposed PostgREST schema. Unknown objects must remain inaccessible
-- until a later migration grants the minimum privileges and adds explicit policies.
revoke create on schema public from public;
revoke create on schema public from anon;
revoke create on schema public from authenticated;

do $$
declare
  object_record record;
begin
  for object_record in
    select namespace.nspname as schema_name, relation.relname as object_name
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
  loop
    execute format('alter table %I.%I enable row level security', object_record.schema_name, object_record.object_name);
    execute format('alter table %I.%I force row level security', object_record.schema_name, object_record.object_name);
    execute format('revoke all on table %I.%I from anon', object_record.schema_name, object_record.object_name);
    execute format('revoke truncate, references, trigger on table %I.%I from authenticated', object_record.schema_name, object_record.object_name);
  end loop;

  -- Views can bypass table RLS depending on their owner and PostgreSQL version.
  -- Revoke all public API access until each view is explicitly reviewed.
  for object_record in
    select namespace.nspname as schema_name, relation.relname as object_name
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('v', 'm')
  loop
    execute format('revoke all on table %I.%I from anon', object_record.schema_name, object_record.object_name);
    execute format('revoke all on table %I.%I from authenticated', object_record.schema_name, object_record.object_name);
  end loop;

  for object_record in
    select namespace.nspname as schema_name, routine.proname as object_name, pg_get_function_identity_arguments(routine.oid) as arguments
    from pg_proc as routine
    join pg_namespace as namespace on namespace.oid = routine.pronamespace
    where namespace.nspname = 'public'
  loop
    execute format('revoke execute on function %I.%I(%s) from public', object_record.schema_name, object_record.object_name, object_record.arguments);
    execute format('revoke execute on function %I.%I(%s) from anon', object_record.schema_name, object_record.object_name, object_record.arguments);
  end loop;

  if exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relkind in ('r', 'p')
      and (not relation.relrowsecurity or not relation.relforcerowsecurity)
  ) then
    raise exception 'Every public table must have RLS enabled and forced';
  end if;
end
$$;

commit;
