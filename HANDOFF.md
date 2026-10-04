# ETHONE — passation à la prochaine IA (état au 2026-10-04, version 1.55.4)

## Prompt à coller à la prochaine IA (version avec le lien du repo : `PROMPT-IA.md`)

> Tu reprends le monorepo ETHONE : `ethone-next` (site Next.js en export statique sur Cloudflare Pages, https://ethone.dev), `discord-bot` (bot « Etho », discord.js + API Express, sur un VPS avec pm2), `worker` (Cloudflare Worker `raspy-fog-bf5b`) et `supabase` (projet `bvgifyzhpzkbrwdjrqsg`). L'utilisateur parle français, veut de l'autonomie, des rapports honnêtes en français simple, et **aucune fausse donnée** (pas de démo, pas de valeur par défaut inventée : sans donnée on affiche vide, 0 ou « — »).
> Lis d'abord ce fichier en entier, puis `AGENTS.md`, puis le haut de `CHANGELOG.md`. `HANDOFF-TUTORIAL.md` et `docs/archive/HANDOFF-2026-09.md` contiennent l'historique et des méthodes détaillées (une partie est datée).
> Commence par la section « Reste à faire », dans l'ordre.

## Machines et accès
Sur le PC de l'utilisateur (Windows 11, dossier `C:\Claude\dashboard`), tout est déjà configuré : clé SSH, `wrangler` connecté, MCP Supabase. Une IA qui n'a que le lien GitHub n'a AUCUN de ces accès : elle prépare les changements et donne les commandes à lancer.

| Élément | Où | Détails |
|---|---|---|
| Site ethone.dev | Cloudflare Pages | Construit et déployé à chaque push sur `main` (~1 à 2 min). |
| Bot « Etho » | VPS OVH, Ubuntu 24.04, Node 22 | Alias SSH `vps` = `ubuntu@141.94.237.150`. Code dans `~/dashboard` (clone de ce repo), bot dans `~/dashboard/discord-bot`, lancé par pm2 sous le nom `ethone-bot` (node `--import tsx src/index.ts`, pas de build). |
| API du bot | Caddy sur le VPS | `bot.ethone.dev` → `localhost:3001` (`/etc/caddy/Caddyfile`, HTTPS automatique). |
| Secrets du bot | `~/dashboard/discord-bot/.env` sur le VPS | Jamais dans git. Noms : `DISCORD_TOKEN CLIENT_ID CLIENT_SECRET DEFAULT_PREFIX DASHBOARD_URL JWT_SECRET PORT DEV_GUILD_ID SHARED_SPACES_BOT_KEY YT_DLP_COOKIES_FILE MUSIC_BACKEND LAVALINK_HOST LAVALINK_PORT LAVALINK_PASSWORD SPOTIFY_CLIENT_ID SPOTIFY_CLIENT_SECRET YT_RESOLVER_URL YT_RESOLVER_TOKEN SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY` (modèle : `.env.example`). |
| Sauvegardes du bot | `~/backups` sur le VPS | Copies de `discord-bot/data` faites avant les grosses opérations. |
| Lavalink (musique) | NAS Synology de l'utilisateur, Docker | Alias SSH `nas` (réseau local, port 46, utilisateur `liphil`). Relié au VPS par un tunnel SSH inverse (conteneur `lavalink-tunnel`) sur `127.0.0.1:2333`. L'entrée pm2 `lavalink` du VPS est arrêtée exprès : ne pas la supprimer. YouTube refuse Lavalink partout ; l'audio vient de yt-dlp puis de SoundCloud. |
| Worker | Cloudflare Workers `raspy-fog-bf5b` | `https://raspy-fog-bf5b.rub19-mailpro.workers.dev`, configuration dans `worker/wrangler.jsonc`. Secrets (via `wrangler secret put`) : `AI_CREDENTIAL_MASTER_KEY CLOUDFLARE_API_TOKEN DISCORD_CLIENT_ID DISCORD_CLIENT_SECRET GITHUB_CLIENT_SECRET GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET GROQ_API_KEY HENRIK_API_KEY LASTFM_API_KEY NOTION_CLIENT_SECRET OAUTH_STATE_SECRET OPENROUTER_API_KEY RESEND_API_KEY RESEND_FROM RIOT_API_KEY SHARED_SPACES_BOT_KEY STEAM_API_KEY SUPABASE_ISSUER SUPABASE_JWT_SECRET SUPABASE_SECRET_KEY SUPABASE_URL TODOIST_CLIENT_SECRET TOTP_ENCRYPTION_KEY TRACKER_API_KEY TURNSTILE_SECRET TWITCH_CLIENT_ID TWITCH_CLIENT_SECRET VAPID_PRIVATE_KEY VAPID_PUBLIC_KEY`. |
| Base de données | Supabase `bvgifyzhpzkbrwdjrqsg` | Via le MCP Supabase (SQL, migrations, advisors). Toute migration appliquée est AUSSI enregistrée dans `supabase/migrations/AAAAMMJJNNNN_nom.sql`. |
| CI GitHub Actions | `.github/workflows/` | `build-web`, `bot-ci`, `worker-ci`, `build-ios`, `build-android`. iOS et Android ne compilent que là (impossible sous Windows). |

## Commandes

### Installation (nouveau poste)
```bash
git clone https://github.com/Rub19/dashboard.git && cd dashboard
npm install --prefix ethone-next
npm install --prefix discord-bot
npm install --prefix worker
```
Fichiers locaux non versionnés à recréer à la main (demander les valeurs à l'utilisateur, ne jamais les coller dans le chat) : `ethone-next/.env.local` (variables `NEXT_PUBLIC_*`, `TEST_EMAIL`/`TEST_PASSWORD` pour Playwright) et `discord-bot/.env` pour lancer le bot en local.

### Site (`ethone-next`)
```bash
cd ethone-next
npm run dev                        # serveur local http://localhost:3000
npm run build                      # export statique dans dist/ (toujours AVANT tsc)
npx tsc --noEmit                   # types
npm run lint                       # 0 erreur attendue, 73 avertissements connus
npm run test:unit                  # Jest, 296 tests
npx playwright test                # E2E (nécessite TEST_EMAIL et TEST_PASSWORD)
npm run audit:a11y                 # audit accessibilité
npm run audit:responsive           # audit mobile/tablette
```

### Sortir une version (à chaque lot)
```bash
cd ethone-next
node scripts/release.js 1.55.3 2026-10-05 ../release-notes.json   # JSON {fr|en|es|de: {title, items[]}}
npm install --package-lock-only
npm run build && npx tsc --noEmit && npm run lint && npm run test:unit
cd .. && node scripts/audit-security.mjs && node ./scripts/precommit-upload-check.mjs
git add -A && git reset -q discord-bot/scripts/etho-avatar-animated.gif .mcp.json
git -c user.name="Rub19" -c user.email="rub19.mailpro@gmail.com" commit -m "Migration Next.js : v1.55.3 - description"
git push origin main
curl -s https://ethone.dev/version.json          # attendre la nouvelle version (~2 min)
```
`release.js` met à jour `package.json`, `public/version.json`, `CHANGELOG.md` et `data/changelog.ts`. Supprimer le fichier JSON de notes après usage.

### Générateurs de ressources (site)
```bash
cd ethone-next
node scripts/build-avatar-library.mjs [netflix|anime|valorant|lol|pokemon|ethone]   # avatars WebP + catalogue
node scripts/build-icon-set.mjs              # icônes des modules (config : scripts/icon-set.config.json)
node scripts/build-bot-icons.mjs             # icônes statiques du bot (public/bot-icons)
node scripts/build-bot-animated-icons.mjs    # émojis animés a_*.gif du bot
```
Après un changement dans `public/bot-icons`, redémarrer le bot : il synchronise ses émojis d'application au démarrage.

### Bot (`discord-bot`)
```bash
cd discord-bot
npx tsc --noEmit                   # types
npm test                           # tests (5 échouent seulement sous Windows : assertion libuv ; la CI Linux est verte)
npm run node:dev                   # lancer en local (nécessite discord-bot/.env)
npm run music:doctor               # diagnostic musique / Lavalink
```

### VPS (déployer et surveiller le bot)
```bash
# Déployer la dernière version de main
ssh vps 'cd ~/dashboard && git checkout -- discord-bot/package-lock.json; git pull -q origin main && npm install --prefix discord-bot --silent; pm2 restart ethone-bot'

ssh vps 'pm2 status'                                        # état des processus
ssh vps 'pm2 logs ethone-bot --lines 80 --nostream'         # derniers journaux
ssh vps 'pm2 logs ethone-bot --err --lines 80 --nostream'   # erreurs seulement
curl -sI https://bot.ethone.dev/ | head -1                  # le bot répond-il ? (502 = bot arrêté)

# Sauvegarder les données avant une opération risquée
ssh vps 'cp -r ~/dashboard/discord-bot/data ~/backups/data-$(date +%Y%m%d-%H%M)'

# Modifier un secret du bot : c'est l'UTILISATEUR qui le fait, pas l'IA
ssh -t vps 'nano ~/dashboard/discord-bot/.env' && ssh vps 'pm2 restart ethone-bot'

# Caddy (proxy HTTPS de bot.ethone.dev)
ssh vps 'sudo systemctl status caddy --no-pager'
ssh vps 'sudo systemctl reload caddy'
```
pm2 arrête le bot proprement (SIGINT, délai 5 s). Ne jamais `pm2 delete` l'entrée `lavalink`.

### NAS (Lavalink)
```bash
ssh nas 'sudo docker ps'                             # conteneurs lavalink + lavalink-tunnel
ssh nas 'sudo docker logs --tail 80 lavalink'
ssh nas 'sudo docker restart lavalink lavalink-tunnel'
```
Le NAS n'est joignable que depuis le réseau de l'utilisateur et demande son mot de passe SSH (pas de clé) : c'est lui qui lance ces commandes. Le mot de passe Lavalink est dans `~/lavalink/.password` sur le NAS ; l'utilisateur le recopie lui-même dans le `.env` du VPS.

### Worker (`worker`)
```bash
cd worker
npm test                           # 281 tests
npm run check                      # syntaxe
npx wrangler deploy                # déployer
npx wrangler tail --format pretty  # journaux en direct (ex. connexions OAuth, Data Dragon)
npx wrangler secret list           # noms des secrets (jamais les valeurs)
npx wrangler secret put NOM        # l'UTILISATEUR tape la valeur, l'IA ne la voit jamais
```

### Supabase
Avec le MCP Supabase : `list_migrations`, `apply_migration`, `execute_sql`, `get_advisors` (security et performance). Sans MCP, avec la CLI Supabase connectée par l'utilisateur :
```bash
npx supabase link --project-ref bvgifyzhpzkbrwdjrqsg
npx supabase db push               # applique supabase/migrations/
```

### Git
```bash
git status --short                 # etho-avatar-animated.gif et .mcp.json apparaissent toujours : normal, ne pas les committer
git log --oneline -10
```

## Autres accès
- **Chrome de l'utilisateur** (extension Claude in Chrome) : il est connecté à ethone.dev. Ne jamais y modifier ses réglages ni cliquer sur une action destructrice ; ouvrir un onglet à soi et le fermer à la fin. Un onglet en arrière-plan ne se rend pas : prendre une capture d'écran avant de lire ou cliquer.
- L'utilisateur a donné carte blanche pour déployer (« je te laisse tout faire ») : annoncer chaque déploiement dans le rapport. Envoyer un message ou un e-mail en son nom demande sa permission.

## Règles permanentes
- **Commits** : `git -c user.name="Rub19" -c user.email="rub19.mailpro@gmail.com" commit -m "Migration Next.js : vX.Y.Z - description"`, en français, **sans ligne Co-Authored-By d'IA**. Pousser directement sur `main`.
- **Ne jamais committer** `discord-bot/scripts/etho-avatar-animated.gif` ni `.mcp.json` (toujours `git reset -q` sur ces deux fichiers avant le commit).
- **À chaque lot** : `cd ethone-next && node scripts/release.js <version> <AAAA-MM-JJ> <fichier.json>` (JSON `{fr|en|es|de: {title, items[]}}` : met à jour `package.json`, `CHANGELOG.md` et `data/changelog.ts`), puis `npm install --package-lock-only`.
- **Vérifications avant commit** (dans cet ordre) : `npm run build` (AVANT `tsc`, sinon d'anciens types `.next` font échouer `tsc`), `npx tsc --noEmit`, `npm run lint` (0 erreur, 73 avertissements attendus), `npm run test:unit` (296 tests), puis depuis la racine `node scripts/audit-security.mjs` et `node ./scripts/precommit-upload-check.mjs`. Bot : `cd discord-bot && npx tsc --noEmit`. Worker : `npm test` (281 tests).
- **Secrets** : ne jamais accepter, coller, afficher ni utiliser un secret fourni en clair. Donner à l'utilisateur une commande qui le manipule sans l'afficher.
- **Interface** : appliquer le skill `apple-design` (ressorts critiquement amortis, menus ancrés, retour au clic, réduction des animations respectée, jetons de thème plutôt que couleurs en dur, lisible en thème clair Arctic).

## Architecture rapide
- Site : une page par module dans `ethone-next/app/discord/**`. Il parle au bot via `https://bot.ethone.dev` (cookie du bot, `fetch(..., { credentials: "include" })`). Registre des modules : `lib/discord-modules.ts`. Icônes : `scripts/icon-set.config.json` puis `node scripts/build-icon-set.mjs`.
- **Profil** (refait en 1.53) : source unique `lib/profile/account-profile.ts` = table `ethone_public_profiles` (une ligne par compte, Realtime activé), écriture optimiste, upload d'images dans le bucket `profile-media` (dossier `<user_id>/`, PNG/JPG/WebP/GIF ≤ 5 Mo). `lib/hooks/useUserIdentity.ts` en dérive pour tous les écrans. Page : `app/profile/page.tsx` (onglets Profil, Statut, Apparence avec bannière perso, Compte). Cadres et fonds : `lib/profile/cosmetics.ts`.
- **Avatars** : 530 images WebP dans `public/avatars/library/<collection>/`, catalogue `lib/identity/avatar-library.json` (+ `.ts`). Régénération : `node scripts/build-avatar-library.mjs [collection…]` (sources Netflix dans `assets/avatar-sources/netflix/`, anime via AniList, Valorant via valorant-api, LoL via Data Dragon, Pokémon via PokeAPI). Sélecteur : `components/profile/AvatarLibrary.tsx`.
- **Synchronisation entre appareils** : `lib/hooks/useUserState.ts` (table `ethone_user_state`, un abonnement Realtime partagé par compte, diffusion entre composants du même onglet, `legacyKey` pour reprendre une ancienne clé locale). `lib/hooks/useLocalStorage.ts` envoie les clés de `SYNCED_LOCAL_KEYS` dans le compte. `components/RawKeySync.tsx` synchronise les clés lues directement en localStorage (préréglages, historique et objectif Focus).
- **Brain** : `lib/hooks/useBrain.ts` construit le prompt ; `lib/brain/live-facts.ts` y ajoute la météo de la ville réglée et les dernières parties Valorant/LoL (Riot ID du Tracker : `settings.liveTrackerRiotName/Tag`).
- **Tracker** : LoL `lib/lol-tracker.ts` + `components/tracker/LolMatchRow.tsx` (version Data Dragon récupérée au chargement, icônes reconstruites côté navigateur à partir des identifiants) ; Valorant `components/tracker/ValorantTrackerView.tsx`, « Charger plus » via la route worker `/api/stats/valorant-matches?page=N` (HenrikDev `stored-matches`, données résumées).
- **Bot animé** : émojis d'application synchronisés au démarrage depuis `ethone-next/public/bot-icons/` (`src/services/appEmojis.ts`, préfixe `etho_`). Les GIF animés `a_*.gif` sont générés par `node scripts/build-bot-animated-icons.mjs`. `src/services/animatedEmojis.ts` intercepte `client.rest.request` et remplace ✅ ❌ ⚠️ ℹ️ ⏳ ✨ par les émojis animés (contenu, descriptions, valeurs de champs, textes V2, émojis de boutons ; jamais les titres). Cartes de bienvenue/départ animées (GIF) : `src/modules/welcome/images/animatedCard.ts` (encodeur `gifenc`, tramage Bayer), option `image.animated` (vrai par défaut, sans effet avec un fond perso).
- **Module Émojis** : page `app/discord/emojis/EmojiStudioClient.tsx`, routes bot `GET/POST/DELETE /api/guilds/:id/server/emojis` (POST : base64 uniquement, 256 Ko max, limite JSON relevée pour cette seule route).
- **Thèmes** : menu de la barre du haut `components/ThemePicker.tsx` (clic droit : appliquer, police, dupliquer en thème perso, supprimer) ; le studio `components/settings/ThemeStudio.tsx` lit l'intention via `lib/theme-intent.ts`.
- Musique : Lavalink 4 en Docker sur le NAS (tunnels SSH), YouTube bloqué côté Lavalink, chemin réel yt-dlp puis SoundCloud. L'entrée pm2 `lavalink` arrêtée sur le VPS est normale.

## Fait pendant la session du 2026-10-03/04 (v1.52.12 → v1.55.2)
- Thème clair : panneaux restés noirs corrigés (connexions, guide, changelog, dock mobile, tracker…), revue de toutes les pages principales.
- Supabase : règles d'accès optimisées, 22 index de clés étrangères, index en double supprimé ; Realtime sur `ethone_public_profiles` ; colonnes `status_text`, `status_emoji`, `banner_url` ; GIF autorisés dans `profile-media`.
- Code : 94 fichiers morts supprimés (site, bot, worker), ~120 variables mortes retirées, imports nettoyés, 4 dépendances de hooks corrigées.
- Écrans de chargement réels sur 8 pages Discord ; requêtes Invitations en parallèle.
- Profil et bibliothèque d'avatars refaits de zéro, profil et données locales synchronisés en direct ; bannière de profil personnalisée.
- Tracker LoL : plus aucune donnée inventée (objets, sorts, runes, champions, LP, durée « 25m 00s »), remakes marqués, bonne équipe gagnante, version Data Dragon automatique.
- Tracker Valorant : historique paginé réel.
- Brain : météo et parties en direct.
- Connexions : GitHub corrigé (rétablissement du Client ID officiel Ov23li7gnklQJ7ipkgZG, acceptation de redirectUri dans le Worker Cloudflare, échange OAuth opérationnel, test en direct validé en 775 ms et profil synchronisé).
- Bot : émojis et boutons animés, logo animé dans `/help`, cartes de bienvenue/départ animées ; module Émojis du serveur.
- Thèmes : clic droit dans le menu Thèmes, thèmes perso visibles ; la réécriture `/settings/* → /settings/general/` de `public/_redirects` (qui masquait toutes les sections des Réglages) est supprimée.

## Reste à faire (par priorité)
1. **Thèmes, clic droit** : revérifier dans Chrome « Modifier la police… » et « Créer un thème à partir de celui-ci » maintenant que `/settings/themes/` s'ouvre bien sur le studio (le test précédent était faussé par la réécriture supprimée en 1.55.2). Ne pas enregistrer de thème sans accord.
2. **Bot animé, vérification réelle** : regarder dans un vrai salon qu'une réponse du bot affiche bien les émojis animés (29 émojis d'application synchronisés au dernier démarrage) et qu'une arrivée de membre envoie la carte GIF. Ajouter dans le module Accueil du site un interrupteur « Carte animée » (champ `image.animated`) et afficher l'aperçu GIF (la route d'aperçu renvoie déjà `image/gif`).
3. **Module Émojis** : jamais testé avec un vrai envoi. Tester l'ajout puis la suppression d'un émoji sur le serveur de test (permission « Gérer les expressions » requise), et vérifier les messages d'erreur (quota, permission).
4. **Synchronisation** : faire tester par l'utilisateur sur deux appareils (changer le statut sur l'un, il doit apparaître sur l'autre sans recharger). `RawKeySync` compare toutes les 3 s et ne force pas le rafraîchissement des écrans Focus : brancher un écouteur dans ces modules si l'utilisateur veut du vrai direct.
5. **Valorant** : les parties anciennes (`metadata.summaryOnly`) n'ont que le joueur ; masquer ou adapter le détail déplié de `ValorantMatchRow` pour elles.
6. **Worker et Data Dragon** : depuis Cloudflare, les requêtes vers `ddragon.leagueoflegends.com` échouent (`UPSTREAM_UNAVAILABLE`, visible avec `wrangler tail`). Le site contourne en reconstruisant les icônes ; chercher la cause (blocage de l'egress Cloudflare ? délai ?) si on veut les noms d'objets côté worker.
7. **Brain** : on pourrait ajouter les événements du jour, les tâches ouvertes et le morceau en cours avec leur titre dans `live-facts.ts`.
8. **Supabase** : 3 avertissements « multiple permissive policies » (`ethone_shared_spaces`, `ethone_shared_space_members`) à fusionner prudemment. La protection des mots de passe divulgués apparaissait encore désactivée après que l'utilisateur l'a activée (peut demander l'offre Pro).
9. **Qualité** : 73 avertissements de lint (56 `<img>` sans intérêt en export statique, le reste des dépendances de hooks volontaires). 5 tests du bot échouent uniquement sous Windows (assertion libuv à la fermeture) ; la CI Linux est verte.
10. **Autre appareil de l'utilisateur** : un ancien client recréait des notifications « Nouveau mail » en double ; le déclencheur SQL `ethone_strip_legacy_mail_notifications` les nettoie, mais il faut que l'utilisateur ouvre ETHONE sur cet appareil pour qu'il se mette à jour.
11. **Application iOS** (`ios/`) : non touchée pendant cette session, vérifier la parité avec les nouveautés (profil, avatars, émojis).
