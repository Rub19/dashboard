begin;

-- Add drop-specific activity events.
alter table public.ethone_file_activity drop constraint if exists ethone_file_activity_event_type_check;
alter table public.ethone_file_activity add constraint ethone_file_activity_event_type_check check (event_type in ('uploaded','shared','link_created','downloaded','link_revoked','deleted','moved','renamed','folder_created','drop_received','drop_revoked'));

commit;
