-- Étend ethone_bot_telemetry aux onglets Commandes/Erreurs/IA/Sécurité du Centre de contrôle
-- (mêmes colonnes jsonb, même policy RLS déjà en place — pas de nouvelle policy nécessaire).

begin;

alter table public.ethone_bot_telemetry
  add column if not exists commands jsonb not null default '[]'::jsonb,
  add column if not exists errors jsonb not null default '{}'::jsonb,
  add column if not exists ai_usage jsonb not null default '{}'::jsonb,
  add column if not exists security jsonb not null default '{}'::jsonb;

commit;
