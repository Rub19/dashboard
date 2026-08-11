begin;

alter table public.user_provider_credentials drop constraint user_provider_credentials_provider_check;
alter table public.user_provider_credentials add constraint user_provider_credentials_provider_check check (
  provider in ('steam', 'twitch', 'lastfm', 'henrik', 'tracker', 'riot', 'openai', 'anthropic', 'gemini', 'groq', 'plex')
);

alter table public.user_provider_credentials drop constraint user_provider_credentials_shape;
alter table public.user_provider_credentials add constraint user_provider_credentials_shape check (
  case provider
    when 'twitch' then (
      credential ? 'clientId' and credential ? 'clientSecret'
      and char_length(credential ->> 'clientId') between 4 and 128
      and char_length(credential ->> 'clientSecret') between 4 and 128
    )
    when 'riot' then (
      credential ? 'henrikApiKey' and credential ? 'riotApiKey'
      and char_length(credential ->> 'henrikApiKey') between 4 and 200
      and char_length(credential ->> 'riotApiKey') between 4 and 200
    )
    else (
      credential ? 'apiKey'
      and char_length(credential ->> 'apiKey') between 4 and 200
    )
  end
);

commit;
