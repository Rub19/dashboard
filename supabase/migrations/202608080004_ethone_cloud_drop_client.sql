begin;

-- Track client id per drop so public uploads can write without re-authenticating.
alter table public.ethone_file_drops add column if not exists drive_client_id text check (char_length(drive_client_id) <= 120);

commit;
