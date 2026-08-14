begin;

create table if not exists public.ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  provider text not null,
  model text not null,
  feature text not null default 'brain',
  priority text not null default 'normal',
  estimated_neurons numeric,
  actual_neurons numeric,
  success boolean not null default false,
  fallback_used boolean not null default false,
  fallback_reason text,
  error_code text,
  latency_ms integer,
  quota_used numeric,
  quota_budget numeric,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists ai_usage_logs_user_created_idx
  on public.ai_usage_logs (user_id, created_at desc);

create index if not exists ai_usage_logs_request_id_idx
  on public.ai_usage_logs (request_id);

create index if not exists ai_usage_logs_provider_created_idx
  on public.ai_usage_logs (provider, created_at desc);

alter table public.ai_usage_logs enable row level security;

-- Only service_role can write; authenticated users can only read their own rows
-- (Worker uses service_role for inserts.)
create policy ai_usage_logs_service_insert
  on public.ai_usage_logs for insert to service_role
  with check (true);

create policy ai_usage_logs_user_select
  on public.ai_usage_logs for select to authenticated
  using ((select auth.uid()) = user_id);

revoke all on public.ai_usage_logs from public, anon;
grant select on public.ai_usage_logs to authenticated;
grant all on public.ai_usage_logs to service_role;

-- Extend provider credential check to include new AI providers
alter table public.user_provider_credentials drop constraint if exists user_provider_credentials_provider_check;
alter table public.user_provider_credentials add constraint user_provider_credentials_provider_check check (
  provider in (
    'steam', 'twitch', 'lastfm', 'henrik', 'tracker', 'riot',
    'openai', 'anthropic', 'gemini', 'groq', 'deepseek', 'openrouter',
    'ollama', 'lm-studio'
  )
);

commit;
