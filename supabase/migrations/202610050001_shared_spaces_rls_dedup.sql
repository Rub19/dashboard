-- Espaces partagés : règles d'accès dédoublonnées ET sans récursion.
-- Avant : la règle de lecture des espaces lisait les membres, et celle des membres lisait les espaces, d'où
-- l'erreur « infinite recursion detected in policy » pour tout utilisateur connecté. Les deux vérifications
-- croisées passent maintenant par des fonctions SECURITY DEFINER (elles lisent sans repasser par les règles).
-- Droits inchangés : un espace se lit par son propriétaire ou un membre actif et ne se modifie que par son
-- propriétaire ; une adhésion se lit et se met à jour par le membre ou le propriétaire de l'espace, et ne se
-- crée ou supprime que par le propriétaire. La règle restrictive ethone_mfa_gate n'est pas touchée.

begin;

create or replace function public.ethone_is_space_owner(p_space uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ethone_shared_spaces
    where id = p_space and owner_id = (select auth.uid())
  );
$$;

create or replace function public.ethone_is_space_member(p_space uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ethone_shared_space_members
    where space_id = p_space and user_id = (select auth.uid()) and status = 'active'
  );
$$;

revoke all on function public.ethone_is_space_owner(uuid) from public, anon;
revoke all on function public.ethone_is_space_member(uuid) from public, anon;
grant execute on function public.ethone_is_space_owner(uuid) to authenticated;
grant execute on function public.ethone_is_space_member(uuid) to authenticated;

-- 1. ethone_shared_spaces
drop policy if exists ethone_shared_spaces_owner_all on public.ethone_shared_spaces;
drop policy if exists ethone_shared_spaces_member_select on public.ethone_shared_spaces;
drop policy if exists ethone_shared_spaces_select on public.ethone_shared_spaces;
drop policy if exists ethone_shared_spaces_insert on public.ethone_shared_spaces;
drop policy if exists ethone_shared_spaces_update on public.ethone_shared_spaces;
drop policy if exists ethone_shared_spaces_delete on public.ethone_shared_spaces;

create policy ethone_shared_spaces_select
  on public.ethone_shared_spaces for select to authenticated
  using (owner_id = (select auth.uid()) or public.ethone_is_space_member(id));

create policy ethone_shared_spaces_insert
  on public.ethone_shared_spaces for insert to authenticated
  with check (owner_id = (select auth.uid()));

create policy ethone_shared_spaces_update
  on public.ethone_shared_spaces for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy ethone_shared_spaces_delete
  on public.ethone_shared_spaces for delete to authenticated
  using (owner_id = (select auth.uid()));

-- 2. ethone_shared_space_members
drop policy if exists ethone_shared_space_members_owner_all on public.ethone_shared_space_members;
drop policy if exists ethone_shared_space_members_self_select on public.ethone_shared_space_members;
drop policy if exists ethone_shared_space_members_self_update on public.ethone_shared_space_members;
drop policy if exists ethone_shared_space_members_select on public.ethone_shared_space_members;
drop policy if exists ethone_shared_space_members_insert on public.ethone_shared_space_members;
drop policy if exists ethone_shared_space_members_update on public.ethone_shared_space_members;
drop policy if exists ethone_shared_space_members_delete on public.ethone_shared_space_members;

create policy ethone_shared_space_members_select
  on public.ethone_shared_space_members for select to authenticated
  using (user_id = (select auth.uid()) or public.ethone_is_space_owner(space_id));

create policy ethone_shared_space_members_insert
  on public.ethone_shared_space_members for insert to authenticated
  with check (public.ethone_is_space_owner(space_id));

create policy ethone_shared_space_members_update
  on public.ethone_shared_space_members for update to authenticated
  using (user_id = (select auth.uid()) or public.ethone_is_space_owner(space_id))
  with check (user_id = (select auth.uid()) or public.ethone_is_space_owner(space_id));

create policy ethone_shared_space_members_delete
  on public.ethone_shared_space_members for delete to authenticated
  using (public.ethone_is_space_owner(space_id));

commit;
