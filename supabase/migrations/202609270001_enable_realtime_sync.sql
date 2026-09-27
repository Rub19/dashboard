-- Synchronisation en temps réel PC <-> iOS.
-- La publication `supabase_realtime` ne contenait AUCUNE table : les abonnements `postgres_changes` du site (useTasks, useItems,
-- useHabits, SettingsProvider…) ne recevaient donc jamais rien et un changement n'apparaissait qu'après rechargement.
-- Les événements respectent les politiques RLS existantes (chaque utilisateur ne reçoit que ses lignes).
-- `replica identity full` : sans lui, les suppressions n'embarquent que la clé primaire et le filtre `user_id=eq.…` les écarte.

begin;

do $$
declare
  realtime_tables text[] := array[
    'tasks', 'ethone_items', 'ethone_habits', 'ethone_habit_completions', 'ethone_focus_sessions',
    'user_settings', 'ethone_user_state', 'ethone_user_data', 'desktop_layout',
    'ethone_shared_spaces', 'ethone_space_tasks', 'ethone_space_notes', 'ethone_space_events'
  ];
  full_identity text[] := array[
    'tasks', 'ethone_items', 'ethone_habits', 'ethone_habit_completions', 'ethone_focus_sessions',
    'ethone_user_data', 'ethone_shared_spaces', 'ethone_space_tasks', 'ethone_space_notes', 'ethone_space_events'
  ];
  t text;
begin
  foreach t in array realtime_tables loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t)
       and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;

  foreach t in array full_identity loop
    if exists (select 1 from pg_tables where schemaname = 'public' and tablename = t) then
      execute format('alter table public.%I replica identity full', t);
    end if;
  end loop;
end $$;

commit;
