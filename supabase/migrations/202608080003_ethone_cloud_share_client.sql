begin;

-- Store the Google Drive client id used to sync each file so public shares can download without re-authenticating.
alter table public.ethone_files add column if not exists drive_client_id text check (char_length(drive_client_id) <= 120);

-- Track client id per share for direct downloads.
alter table public.ethone_file_shares add column if not exists drive_client_id text check (char_length(drive_client_id) <= 120);

commit;
