-- Corrections des avertissements de performance Supabase (advisors), sans changement de droits.

-- 1. auth.uid() / auth.jwt() évalués une seule fois par requête au lieu d'une fois par ligne.
alter policy "Users can manage own items" on public.ethone_items
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
alter policy ethone_bot_telemetry_select on public.ethone_bot_telemetry
  using (lower((select auth.jwt()) ->> 'email') = 'rub19.mailpro@gmail.com');
alter policy ethone_bot_owner_actions_select on public.ethone_bot_owner_actions
  using (lower((select auth.jwt()) ->> 'email') = 'rub19.mailpro@gmail.com');
alter policy ethone_bot_owner_actions_insert on public.ethone_bot_owner_actions
  with check (lower((select auth.jwt()) ->> 'email') = 'rub19.mailpro@gmail.com');
alter policy ethone_bot_system_roles_select on public.ethone_bot_system_roles
  using (lower((select auth.jwt()) ->> 'email') = 'rub19.mailpro@gmail.com');

-- 2. Index en double sur dashboard_data(user_id).
drop index if exists public.idx_dashboard_data_user_id;

-- 3. Index sur les clés étrangères (suppressions en cascade et jointures).
create index if not exists ethone_bot_owner_actions_user_id_fk_idx on public.ethone_bot_owner_actions (user_id);
create index if not exists ethone_device_verif_approving_device_fk_idx on public.ethone_device_verification_requests (approving_device_id);
create index if not exists ethone_device_verif_requesting_device_fk_idx on public.ethone_device_verification_requests (requesting_device_id);
create index if not exists ethone_file_activity_drop_id_fk_idx on public.ethone_file_activity (drop_id);
create index if not exists ethone_file_activity_file_id_fk_idx on public.ethone_file_activity (file_id);
create index if not exists ethone_file_activity_share_id_fk_idx on public.ethone_file_activity (share_id);
create index if not exists ethone_file_favorites_file_id_fk_idx on public.ethone_file_favorites (file_id);
create index if not exists ethone_file_shares_file_id_fk_idx on public.ethone_file_shares (file_id);
create index if not exists ethone_files_brain_suggested_folder_fk_idx on public.ethone_files (brain_suggested_folder);
create index if not exists ethone_files_parent_id_fk_idx on public.ethone_files (parent_id);
create index if not exists ethone_habit_completions_user_id_fk_idx on public.ethone_habit_completions (user_id);
create index if not exists ethone_mail_attachments_user_id_fk_idx on public.ethone_mail_attachments (user_id);
create index if not exists ethone_mail_notifications_rule_id_fk_idx on public.ethone_mail_notifications (rule_id);
create index if not exists ethone_mail_outbox_message_id_fk_idx on public.ethone_mail_outbox (message_id);
create index if not exists ethone_mail_outbox_user_id_fk_idx on public.ethone_mail_outbox (user_id);
create index if not exists ethone_passkeys_device_id_fk_idx on public.ethone_passkeys (device_id);
create index if not exists ethone_security_events_device_id_fk_idx on public.ethone_security_events (device_id);
create index if not exists ethone_security_events_passkey_id_fk_idx on public.ethone_security_events (passkey_id);
create index if not exists ethone_shared_space_members_invited_by_fk_idx on public.ethone_shared_space_members (invited_by);
create index if not exists ethone_space_events_created_by_fk_idx on public.ethone_space_events (created_by);
create index if not exists ethone_space_notes_created_by_fk_idx on public.ethone_space_notes (created_by);
create index if not exists ethone_space_tasks_created_by_fk_idx on public.ethone_space_tasks (created_by);
