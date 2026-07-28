begin;

alter table public.user_oauth_tokens drop constraint if exists user_oauth_tokens_provider_check;
alter table public.user_oauth_tokens add constraint user_oauth_tokens_provider_check
  check (provider in ('spotify', 'github', 'google-calendar', 'notion', 'todoist'));

commit;
