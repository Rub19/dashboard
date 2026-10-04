-- Migration de consolidation RLS pour ethone_shared_spaces et ethone_shared_space_members
-- Résout les 3 avertissements Supabase Advisor « multiple permissive policies »
-- en remplaçant les règles `FOR ALL` chevauchantes par des règles dédiées (SELECT, INSERT, UPDATE, DELETE)
-- sans aucun changement de droits.

begin;

-- ============================================================================
-- 1. ethone_shared_spaces
-- Ancien état :
--   - ethone_shared_spaces_owner_all (FOR ALL to authenticated)
--   - ethone_shared_spaces_member_select (FOR SELECT to authenticated)
-- -> Conflit / double politique permissive sur SELECT
-- ============================================================================

drop policy if exists ethone_shared_spaces_owner_all on public.ethone_shared_spaces;
drop policy if exists ethone_shared_spaces_member_select on public.ethone_shared_spaces;
drop policy if exists ethone_shared_spaces_select on public.ethone_shared_spaces;
drop policy if exists ethone_shared_spaces_insert on public.ethone_shared_spaces;
drop policy if exists ethone_shared_spaces_update on public.ethone_shared_spaces;
drop policy if exists ethone_shared_spaces_delete on public.ethone_shared_spaces;

-- SELECT unifié : propriétaire OU membre actif
create policy ethone_shared_spaces_select
  on public.ethone_shared_spaces for select to authenticated
  using (
    owner_id = (select auth.uid())
    or id in (
      select space_id from public.ethone_shared_space_members
      where user_id = (select auth.uid()) and status = 'active'
    )
  );

-- INSERT : propriétaire uniquement
create policy ethone_shared_spaces_insert
  on public.ethone_shared_spaces for insert to authenticated
  with check (owner_id = (select auth.uid()));

-- UPDATE : propriétaire uniquement
create policy ethone_shared_spaces_update
  on public.ethone_shared_spaces for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

-- DELETE : propriétaire uniquement
create policy ethone_shared_spaces_delete
  on public.ethone_shared_spaces for delete to authenticated
  using (owner_id = (select auth.uid()));


-- ============================================================================
-- 2. ethone_shared_space_members
-- Ancien état :
--   - ethone_shared_space_members_owner_all (FOR ALL to authenticated)
--   - ethone_shared_space_members_self_select (FOR SELECT to authenticated)
--   - ethone_shared_space_members_self_update (FOR UPDATE to authenticated)
-- -> Conflits / doubles politiques permissives sur SELECT et UPDATE
-- ============================================================================

drop policy if exists ethone_shared_space_members_owner_all on public.ethone_shared_space_members;
drop policy if exists ethone_shared_space_members_self_select on public.ethone_shared_space_members;
drop policy if exists ethone_shared_space_members_self_update on public.ethone_shared_space_members;
drop policy if exists ethone_shared_space_members_select on public.ethone_shared_space_members;
drop policy if exists ethone_shared_space_members_insert on public.ethone_shared_space_members;
drop policy if exists ethone_shared_space_members_update on public.ethone_shared_space_members;
drop policy if exists ethone_shared_space_members_delete on public.ethone_shared_space_members;

-- SELECT unifié : propriétaire de l'espace OU le membre lui-même
create policy ethone_shared_space_members_select
  on public.ethone_shared_space_members for select to authenticated
  using (
    user_id = (select auth.uid())
    or space_id in (
      select id from public.ethone_shared_spaces
      where owner_id = (select auth.uid())
    )
  );

-- INSERT : propriétaire de l'espace uniquement
create policy ethone_shared_space_members_insert
  on public.ethone_shared_space_members for insert to authenticated
  with check (
    space_id in (
      select id from public.ethone_shared_spaces
      where owner_id = (select auth.uid())
    )
  );

-- UPDATE unifié : propriétaire de l'espace OU le membre lui-même (maintien du user_id)
create policy ethone_shared_space_members_update
  on public.ethone_shared_space_members for update to authenticated
  using (
    user_id = (select auth.uid())
    or space_id in (
      select id from public.ethone_shared_spaces
      where owner_id = (select auth.uid())
    )
  )
  with check (
    user_id = (select auth.uid())
    or space_id in (
      select id from public.ethone_shared_spaces
      where owner_id = (select auth.uid())
    )
  );

-- DELETE : propriétaire de l'espace uniquement
create policy ethone_shared_space_members_delete
  on public.ethone_shared_space_members for delete to authenticated
  using (
    space_id in (
      select id from public.ethone_shared_spaces
      where owner_id = (select auth.uid())
    )
  );

commit;
