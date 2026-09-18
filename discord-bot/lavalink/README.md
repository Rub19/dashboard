# Backend musique Lavalink

Depuis `MUSIC_BACKEND=lavalink`, le bot ne fait plus **aucun** traitement audio :
un serveur [Lavalink](https://lavalink.dev) (Java) tourne à côté, gère YouTube
via le plugin [youtube-source](https://github.com/lavalink-devs/youtube-source)
(OAuth sur un compte jetable, plusieurs clients YouTube), et envoie lui-même
l'audio à Discord. C'est l'architecture de la majorité des bots musique publics.

## Installation (VPS, une fois)

```bash
cd ~/dashboard/discord-bot && git pull && npm install && npm run node:build
bash scripts/lavalink-setup.sh
```

Le script : installe Java 17 si besoin, télécharge `Lavalink.jar`, écrit
`~/lavalink/application.yml` depuis [application.yml](application.yml) avec un
mot de passe généré, met à jour le `.env` du bot (`MUSIC_BACKEND=lavalink`,
`LAVALINK_*`) et lance Lavalink sous pm2 (`pm2 logs lavalink`).

## Appairage YouTube (compte Google jetable, une fois)

Au premier démarrage, Lavalink affiche dans ses logs :

```
pm2 logs lavalink --lines 60 --nostream | grep -iE "google.com/device|refresh token"
```

→ un lien `https://www.google.com/device` et un **code**. Ouvre le lien avec un
**compte Google jetable**, entre le code. Quelques secondes plus tard le
refresh token apparaît dans les logs (`YoutubeOauth2Handler … refreshToken`).
Persiste-le pour ne plus jamais refaire la manip :

```bash
LAVALINK_YT_REFRESH_TOKEN='1//0…' bash scripts/lavalink-setup.sh
```

Puis :

```bash
pm2 restart ethone-bot --update-env
```

## Vérifier

```bash
npm run music:doctor        # section « Lavalink » : version, plugin YouTube, test de recherche
pm2 logs ethone-bot --lines 40 --nostream | grep -i lavalink
```

## Revenir au backend natif

`MUSIC_BACKEND=native` dans `.env`, `pm2 restart ethone-bot --update-env`
(`pm2 stop lavalink` si tu veux libérer la RAM — ~300 Mo).
