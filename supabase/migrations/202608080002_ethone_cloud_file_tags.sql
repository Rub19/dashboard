begin;

-- Add local tags to ETHONE Cloud files.
alter table public.ethone_files add column if not exists tags text[] not null default '{}';

-- Brain-generated metadata.
alter table public.ethone_files add column if not exists brain_summary text check (char_length(brain_summary) <= 2000);
alter table public.ethone_files add column if not exists brain_suggested_folder uuid references public.ethone_files(id) on delete set null;
alter table public.ethone_files add column if not exists brain_analyzed_at timestamptz;

create index if not exists ethone_files_user_tags_idx on public.ethone_files using gin (tags);
create index if not exists ethone_files_user_id_idx on public.ethone_files (user_id);

commit;
