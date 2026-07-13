begin;

do $$
declare
  policy_record record;
  profile_owner_column text;
begin
  if to_regclass('public.dashboard_data') is not null then
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'dashboard_data' and column_name = 'user_id'
    ) then
      raise exception 'dashboard_data.user_id is required before RLS can be hardened safely';
    end if;

    execute 'alter table public.dashboard_data enable row level security';
    execute 'alter table public.dashboard_data force row level security';
    for policy_record in
      select policyname from pg_policies where schemaname = 'public' and tablename = 'dashboard_data'
    loop
      execute format('drop policy if exists %I on public.dashboard_data', policy_record.policyname);
    end loop;

    execute 'create policy dashboard_data_owner_select on public.dashboard_data for select to authenticated using ((select auth.uid()) = user_id)';
    execute 'create policy dashboard_data_owner_insert on public.dashboard_data for insert to authenticated with check ((select auth.uid()) = user_id)';
    execute 'create policy dashboard_data_owner_update on public.dashboard_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)';
    execute 'create policy dashboard_data_owner_delete on public.dashboard_data for delete to authenticated using ((select auth.uid()) = user_id)';
    execute 'revoke all on public.dashboard_data from anon';
    execute 'grant select, insert, update, delete on public.dashboard_data to authenticated';
    execute 'create index if not exists dashboard_data_user_id_idx on public.dashboard_data (user_id)';
  end if;

  if to_regclass('public.profiles') is not null then
    select case
      when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles' and column_name = 'user_id'
      ) then 'user_id'
      when exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles' and column_name = 'id' and data_type = 'uuid'
      ) then 'id'
      else null
    end into profile_owner_column;

    execute 'alter table public.profiles enable row level security';
    execute 'alter table public.profiles force row level security';
    for policy_record in
      select policyname from pg_policies where schemaname = 'public' and tablename = 'profiles'
    loop
      execute format('drop policy if exists %I on public.profiles', policy_record.policyname);
    end loop;
    execute 'revoke all on public.profiles from anon';
    execute 'revoke all on public.profiles from authenticated';

    if profile_owner_column is not null then
      execute format('create policy profiles_owner_select on public.profiles for select to authenticated using ((select auth.uid()) = %I)', profile_owner_column);
      execute format('create policy profiles_owner_update on public.profiles for update to authenticated using ((select auth.uid()) = %I) with check ((select auth.uid()) = %I)', profile_owner_column, profile_owner_column);
      execute 'grant select, update on public.profiles to authenticated';
    end if;
  end if;
end
$$;

commit;
