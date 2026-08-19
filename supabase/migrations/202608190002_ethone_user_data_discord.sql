begin;

alter table public.ethone_user_data
  drop constraint if exists ethone_user_data_kind_check;

alter table public.ethone_user_data
  add constraint ethone_user_data_kind_check
  check (kind in ('space','flow','interaction','macro','persona','bill','plugin','discord'));

commit;
