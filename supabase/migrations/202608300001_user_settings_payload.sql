begin;

alter table public.user_settings
  add column if not exists settings jsonb not null default '{}'::jsonb,
  add constraint user_settings_settings_object check (jsonb_typeof(settings) = 'object');

comment on column public.user_settings.settings is 'Full ETHONE settings object (theme, density, dock, grid, etc.)';

commit;
