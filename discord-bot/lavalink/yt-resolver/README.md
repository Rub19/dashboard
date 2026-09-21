# Service yt-dlp pour Lavalink

Les clients YouTube de Lavalink sont refusés (« Sign in to confirm you're not a bot »), alors que
`yt-dlp` passe depuis une IP de particulier. Ce petit service tourne **sur la même machine que
Lavalink** (même IP publique), renvoie l'adresse directe d'un flux audio, et le bot la donne à
Lavalink, qui la lit comme un flux HTTP (source `http`, activée par défaut).

Sans `YT_RESOLVER_URL` dans le `.env` du bot, rien ne change.

## Sur la machine de Lavalink (Docker)

```sh
mkdir -p ~/lavalink/yt-resolver
curl -fL -o ~/lavalink/yt-resolver/resolver.py \
  https://raw.githubusercontent.com/Rub19/dashboard/main/discord-bot/lavalink/yt-resolver/resolver.py
# jeton d'accès (32 caractères), lisible par toi seul
head -c 48 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32 > ~/lavalink/.resolver_token
chmod 600 ~/lavalink/.resolver_token

sudo docker run -d --name yt-resolver --restart unless-stopped --network host --user root \
  -v ~/lavalink/yt-resolver:/app:ro -v ~/lavalink/.resolver_token:/run/token:ro \
  python:3.12-alpine sh -c "pip install -q --no-cache-dir -U yt-dlp; exec python /app/resolver.py"
```

`pip install -U yt-dlp` est refait à chaque démarrage du conteneur : `sudo docker restart yt-resolver`
suffit pour mettre `yt-dlp` à jour quand YouTube change quelque chose.

Test local : `curl -s http://127.0.0.1:8765/health`.

## Jusqu'au bot (VPS)

Un second tunnel SSH inverse (comme celui de Lavalink) ouvre `127.0.0.1:8765` sur le VPS, puis dans
le `.env` du bot :

```
YT_RESOLVER_URL=http://127.0.0.1:8765
YT_RESOLVER_TOKEN=<contenu de ~/lavalink/.resolver_token de la machine Lavalink>
```
