begin;

create or replace function public.migrate_v8_profiles()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  user_record record;
  state jsonb;
  profiles jsonb;
  active_id text;
  p jsonb;
  profile_name text;
  profile_type text;
  profile_accent text;
  profile_widgets jsonb;
  profile_integrations jsonb;
  custom text;
  has_existing boolean;
begin
  for user_record in
    select user_id, payload
    from public.ethone_user_state
    where payload is not null
      and jsonb_typeof(payload) = 'object'
      and jsonb_typeof(payload->'repository'->'profiles') = 'array'
  loop
    select exists (select 1 from public.ethone_profiles where user_id = user_record.user_id) into has_existing;
    if has_existing then
      continue;
    end if;

    state := user_record.payload;
    profiles := state->'repository'->'profiles';
    active_id := state->'repository'->>'activeProfileId';

    for p in select jsonb_array_elements(profiles) loop
      profile_name := coalesce(p->>'name', p #>> '{state,username}', 'Profil');
      if char_length(profile_name) = 0 then
        profile_name := 'Profil';
      end if;
      if char_length(profile_name) > 120 then
        profile_name := substring(profile_name from 1 for 120);
      end if;

      profile_type := lower(coalesce(p->>'profileType', p->>'type', ''));
      if profile_type not in ('personal', 'work', 'development', 'study', 'gaming', 'streaming', 'creative') then
        if profile_name ~* 'gaming|jeu|valorant|steam' then profile_type := 'gaming';
        elsif profile_name ~* 'dev|code|github' then profile_type := 'development';
        elsif profile_name ~* 'study|étude|etude|school|cours' then profile_type := 'study';
        elsif profile_name ~* 'stream|twitch|obs' then profile_type := 'streaming';
        elsif profile_name ~* 'work|travail|pro' then profile_type := 'work';
        elsif profile_name ~* 'creative|créatif|creatif|design' then profile_type := 'creative';
        else profile_type := 'personal';
        end if;
      end if;

      custom := lower(coalesce(p->'theme'->>'customAccent', p->>'customAccent', ''));
      case custom
        when '#7c3aed', '#8b5cf6', '#9333ea', '#a78bfa' then profile_accent := 'violet';
        when '#ef6f8f', '#f472b6', '#fb7185' then profile_accent := 'rose';
        when '#38bdf8', '#60a5fa', '#8bc9fa' then profile_accent := 'sky';
        when '#f59e0b', '#edc477', '#fbbf24' then profile_accent := 'amber';
        when '#34d399', '#7be5c3', '#72d6a7' then profile_accent := 'mint';
        else
          case profile_type
            when 'work' then profile_accent := 'sky';
            when 'development' then profile_accent := 'sky';
            when 'study' then profile_accent := 'amber';
            when 'gaming' then profile_accent := 'violet';
            when 'streaming' then profile_accent := 'rose';
            when 'creative' then profile_accent := 'amber';
            else profile_accent := 'violet';
          end case;
      end case;

      if jsonb_typeof(p->'environment'->'widgets') = 'array' then
        profile_widgets := p->'environment'->'widgets';
      else
        profile_widgets := '[]'::jsonb;
      end if;

      if jsonb_typeof(p->'environment'->'integrations') = 'array' then
        profile_integrations := p->'environment'->'integrations';
      else
        profile_integrations := '[]'::jsonb;
      end if;

      insert into public.ethone_profiles (
        user_id,
        name,
        type,
        accent,
        widgets,
        integrations,
        is_active,
        created_at,
        updated_at
      ) values (
        user_record.user_id,
        profile_name,
        profile_type,
        profile_accent,
        profile_widgets,
        profile_integrations,
        (p->>'id' = active_id),
        now(),
        now()
      );
    end loop;

    -- Ensure at least one profile is active per user that got migrated.
    if exists (select 1 from public.ethone_profiles where user_id = user_record.user_id and is_active = false) and
       not exists (select 1 from public.ethone_profiles where user_id = user_record.user_id and is_active = true) then
      update public.ethone_profiles
      set is_active = true, updated_at = now()
      where id = (select id from public.ethone_profiles where user_id = user_record.user_id order by created_at asc limit 1);
    end if;
  end loop;
end;
$$;

select public.migrate_v8_profiles();

drop function public.migrate_v8_profiles();

commit;
