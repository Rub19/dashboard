begin;

-- Add invite token to team members for email invitation links.
alter table public.ethone_team_members
  add column if not exists invite_token text not null default '';

create index if not exists ethone_team_members_invite_token_idx on public.ethone_team_members (invite_token);

commit;
