# ETHONE — passation à la prochaine IA (état au 2026-10-08, version 1.55.84)

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
npm run lint                       # 0 erreur attendue, 45 avertissements connus
npm run test:unit                  # Jest, 304 tests
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
npm test                           # 283 tests
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
- **Vérifications avant commit** (dans cet ordre) : `npm run build` (AVANT `tsc`, sinon d'anciens types `.next` font échouer `tsc`), `npx tsc --noEmit`, `npm run lint` (0 erreur, 45 avertissements attendus), `npm run test:unit` (304 tests), puis depuis la racine `node scripts/audit-security.mjs` et `node ./scripts/precommit-upload-check.mjs`. Bot : `cd discord-bot && npx tsc --noEmit`. Worker : `npm test` (283 tests).
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
- **Console Discord style Keeper** (`/discord`, inspirée de https://keeper.jgl-bot.fr à la demande de l'utilisateur) : `components/discord/ServerPicker.tsx` (liste « Avec Etho / Sans Etho »), `HubSidebar.tsx`, `GuildOverviewScreen.tsx` (vue d'ensemble, mode raid réel via `POST /anti-raid/raid-mode`), `GuildSecurityScan.tsx` (scan réel : `GET /api/guilds/:id/server/security-scan`, `/security-scan/last`, `/security-scan/auto` ; logique dans `discord-bot/src/modules/server/services/securityScanService.ts`), `GuildAssistedSetup.tsx` (4 étapes Keeper, plan/application via `POST /server/protection-setup`, logique dans `protectionSetupService.ts`), `BotInstallView.tsx` (détection de présence du bot). Traductions : `lib/i18n-discord.ts`.
- **Pages console** (`?view=settings|access|logs|whitelist|blacklist|members|commands|tools|protections`, rendues dans `app/discord/page.tsx` via `consoleView`) : `components/discord/console/*` + kit commun `console/kit.tsx` (ConsolePage, Panel, Row, Switch, MemberPicker, RoleAdder, ChannelAdder, `useGuildApi`). API bot : `discord-bot/src/server/routes/consoleRoutes.ts` (`/api/guilds/:id/console/*`). Accès façon Keeper (`guildAuth.ts`, `req.guildAccess`) : propriétaire + owners Etho (`guildConfig.ethoOwners`) modifient tout, admins Discord en lecture seule (403 `READ_ONLY` hors jeux du casino), seul le propriétaire gère les owners. Blacklist : `blacklistService.ts` (ban à l'ajout et au retour). MP au propriétaire : `ownerAlertService.ts` (`ownerDmAlerts`). Règles par commande : `guildConfig.commandRules` appliquées par `commandRulesService.ts` dans `interactionCreate.ts` et `messageCreate.ts` (compteurs en mémoire). Outils : `captchaService.ts` (captcha image @napi-rs/canvas, file en mémoire, boutons `captcha_*`) et `supportersService.ts` (rôle si `user.primaryGuild` = ce serveur et/ou statut perso contenant `supporters.statusText` ; intent Présences activé sur le portail et dans `src/index.ts`). Protections : `ConsoleProtections.tsx` lit/écrit `/anti-raid/config` et `/anti-nuke/config` (interrupteurs par protection anti-nuke : `antiNuke.protections`), sanctions spam/mentions via `punishMessageAuthor` dans `raidDetectionService.ts`. Modules : le hub affiche la vraie page de chaque module via `console/ModuleEmbed.tsx` (import dynamique des `*CenterClient`) ; `embedContext.ts` (`useConsoleEmbed`) masque le `GuildSelector` et garde les onglets en local (Bot, Serveur), les règles `.console-embed` de `globals.css` cachent le lien retour et appliquent le format Keeper. Les anciennes « passerelles » (tuiles figées) sont supprimées.
- **Barre latérale de la console** (`components/discord/HubSidebar.tsx`) : sections Protection, Membres, Animation, Serveur, puis « Owner Etho » (`OwnerBotSection.tsx`, affichée seulement si `GET /api/bot/overview` répond 200, c'est-à-dire pour le propriétaire du bot ; redémarrage via `POST /api/bot/restart`, pm2 relance le processus).
- **Casino** (`/discord/games`) : le bot calcule tout (`discord-bot/src/modules/games/services/webCasino.ts`, routes `POST /games/roulette`, `/games/dice`, `/games/blackjack/start`, `/games/blackjack/:id/action`). Le site n'envoie que la mise et le choix. Les mains de blackjack en cours sont en mémoire (perdues si le bot redémarre).
- **Message d'arrivée du bot** : `discord-bot/src/services/guildJoinService.ts`. Carte Components V2 (état, permissions, commandes, salon système, langue) postée dans un salon privé `etho-bienvenue` visible seulement par l'inviteur (repli : message privé). `/setup vue:welcome` la réaffiche en éphémère.

## Historique des sessions (v1.52.12 → v1.55.67)
- Thème clair : panneaux restés noirs corrigés (connexions, guide, changelog, dock mobile, tracker…), revue de toutes les pages principales.
- Supabase : règles d'accès optimisées, 22 index de clés étrangères, index en double supprimé ; Realtime sur `ethone_public_profiles` ; colonnes `status_text`, `status_emoji`, `banner_url` ; GIF autorisés dans `profile-media`.
- Code : 94 fichiers morts supprimés (site, bot, worker), ~120 variables mortes retirées, imports nettoyés, 4 dépendances de hooks corrigées.
- Écrans de chargement réels sur 8 pages Discord ; requêtes Invitations en parallèle.
- Profil et bibliothèque d'avatars refaits de zéro, profil et données locales synchronisés en direct ; bannière de profil personnalisée.
- Tracker LoL : plus aucune donnée inventée (objets, sorts, runes, champions, LP, durée « 25m 00s »), remakes marqués, bonne équipe gagnante, version Data Dragon automatique.
- Tracker Valorant : historique paginé réel.
- Brain : météo et parties en direct.
- Connexions : GitHub corrigé (rétablissement du Client ID officiel Ov23li7gnklQJ7ipkgZG, acceptation de redirectUri dans le Worker Cloudflare, échange OAuth opérationnel, test en direct validé en 775 ms et profil synchronisé).
- Bot : émojis et boutons animés, logo animé dans `/help`, cartes de bienvenue/départ animées (interrupteur `image.animated` et badge GIF ajoutés au designer d'accueil) ; correction de `/api/guild-presence` (rendu public) pour que les serveurs avec le bot soient bien reconnus et affichés avec « Bot présent ».
- Module Émojis du serveur : testé et validé en conditions réelles (création et suppression d'émoji en production sur le serveur de test). Ajout de la fonctionnalité de renommage depuis le dashboard pour tous les émojis existants (route `PATCH /api/guilds/:guildId/server/emojis/:emojiId`, bouton crayon et édition en ligne dans l'interface).
- Tracker Valorant : adaptation du volet déplié pour les parties archivées (`summaryOnly` / stored-matches) avec résumé individuel détaillé (Combat, Dégâts & Impact, Précision des tirs avec jauge tricolore tête/corps/jambes), suppression du faux badge MVP sur ces parties, et élimination de la durée codée en dur (« 8m 24s ») au profit de la durée réelle issue de l'API Henrik ou du nombre réel de manches.
- Thèmes : clic droit dans le menu Thèmes (Modifier la police…, Créer un thème à partir de celui-ci) revérifié et validé dans Chrome en production sur le studio sans réécriture parasite ; thèmes perso visibles ; la réécriture `/settings/* → /settings/general/` de `public/_redirects` (qui masquait toutes les sections des Réglages) est supprimée.
- Habitudes (v1.55.10) : refonte complète de la page `/habits` avec motion design et 3 modes de disposition (Grille Bento avec validation directe des 7 jours, Vue Semaine en matrice calendaire, Liste Compacte). Anneau radial SVG de complétion quotidienne, séries, régularité hebdomadaire, suggestions d'habitudes en 1 clic.
- Réglages / Workspaces (v1.55.10) : ajout de l'alias statique `/settings/workspaces` (avec un « s ») généré au build et redirigé de manière transparente vers la section Espace de travail des paramètres, éliminant l'erreur 404.
- Dock & Volets (v1.55.11) : refonte motion design Apple-grade de l'ensemble des volets du dock (Centre de contrôle, lecteur média, météo, minuteur Focus, lanceur d'apps) avec physique de ressorts Framer Motion, glassmorphism Sonoma, centrage absolu viewport garanti, slider tactile précis avec retour pourcentage, isolation `FloatingPortal` et interrupteurs switch fluides conformes aux maquettes.
- Brain AI (v1.55.12) : enrichissement en temps réel du contexte Brain avec les tâches en attente (titres et décompte), l'agenda du jour avec les horaires d'événements, et l'interrogation Supabase automatique des habitudes quotidiennes (table `ethone_habits` et complétions) lors de questions sur les routines, séries ou objectifs du jour.
- Animations UI & Flyouts du Dock (v1.55.13) : correction complète des saccades et bugs d'animations. Suppression du wildcard CSS (* transition-duration) qui perturbait les calculs transform RAF de Framer Motion en mode animations réduites. Ajustement au pixel près des boutons switch Apple (h-5.5 w-10, knob h-4.5 w-4.5 avec translation x: 18, suppression du slide intempestif au montage via initial={false}). Fluidification du slider volume avec suppression des délais CSS au glissement. Correction du cycle d'unmount dans AnimatePresence pour que la météo, le lanceur, le minuteur Focus et le centre de contrôle jouent leur animation de sortie fluide sans coupure visuelle.
- Mission Control & Dock (v1.55.15) : refonte intégrale de Mission Control en motion design Sonoma (grille Exposé avec mise à l'échelle responsive, onglets de filtrage par catégorie, barre de sélection des espaces virtuels avec indicateurs d'états, lanceurs rapides pour les espaces vides) et correction de la double fenêtre d'alerte lors d'un clic sur la pastille de notification du dock.
- Application iOS & Parité Mobile (v1.55.16) : parité complète de l'application iOS (SwiftUI) avec le profil web et le serveur Discord : intégration de la bibliothèque d'avatars ETHONE Originals et populaires dans ProfileView avec feuille de sélection visuelle dédiée, résolution automatique dans AvatarView des chemins relatifs /avatars/... vers https://ethone.dev, sélecteur de statut de présence (en ligne, focus, occupé, absent, invisible) avec pastilles de couleur, message et émoji de statut personnalisés avec raccourcis rapides, champ de bio, saisie d'URL d'avatar externe, renommage d'émojis Discord (PATCH /emojis/{id}) avec invite textuelle native dans AdminEngine, et prise en charge unifiée des métadonnées étendues de profil dans la route /api/profile du Worker.
- Tracker Valorant (v1.55.17) : résolution et affichage des rangs réels (MMR) pour tous les joueurs au lieu de « Non classé » dans les modes non-compétitifs (Swiftplay, etc.) via la nouvelle route Cloudflare Worker `/api/stats/valorant-mmr` avec batching jusqu'à 10 joueurs. Correction des colonnes PERF et TRS qui affichaient « — » en restaurant la détection de version Henrik et un repli calculé sur le score de combat (ACS). Formatage du dégât par round (ADR) arrondi à l'entier et calcul exact du pourcentage de tirs à la tête (HS%).
- Stabilité Data Dragon & Hygiène React (v1.55.18) : déploiement et redémarrage propre du bot Discord Etho sur le VPS OVH (pm2) ; sécurisation des requêtes Data Dragon LoL dans le Worker (limite portée à 4 Mo et timeout à 10s) ; nettoyage de 10 avertissements React/linter (liens Next.js dans la politique légale, mémoïsation fine d'activités et filtres, réactivité useLiveData aux changements de ville météo et ID Lanyard). Avertissements linter réduits à 65 (dont 56 `<img>` statiques).
- Résolution intégrale des hooks React et synchronisation multi-onglets (v1.55.19) : résolution complète des avertissements React hooks (exhaustive-deps), variables et navigation Next.js dans useUserState, CommandPalette, BootProvider, AuthProvider, Mail, etc. Avertissements fonctionnels réduits à zéro absolu (seules restent les balises <img> attendues en export statique Next.js). Ajout d'un écouteur d'événements natif storage dans useUserState pour synchronisation instantanée multi-onglets sans latence réseau. Validation complète des 298 tests unitaires Jest, 283 tests Worker, audits de sécurité et build statique (277 pages sans aucune erreur).
- Réactivité instantanée Focus et Préréglages (v1.55.20) : suppression de la latence de scrutation (3 s) dans RawKeySync au profit d'un déclenchement immédiat sur événements (`storage`, `v8:focus-session-completed` et `ethone:raw-key-changed`). Rafraîchissement direct des écrans d'historique et d'objectifs Focus et écoute multi-onglets des préréglages personnalisés dans les paramètres.
- Nouveau module Studio Soundscape & Fréquences (v1.55.21) : création d'un studio audio-visuel immersif complet (`/soundscape`) avec motion design Apple Sonoma, visualiseur réactif 60 FPS sur Canvas avec 4 modes interactifs (Nébuleuse stellaire, Anneau de spectre radial, Horizon d'ondes Bézier, Ondes Zen harmoniques), moteur de synthèse binaurale procédurale stricte (Delta, Theta, Alpha, Beta, Gamma) et fréquences sacrées Solfeggio (432 Hz, 528 Hz, 639 Hz, 852 Hz), mixeur multi-pistes tactile avec jauges de volume, 6 scènes d'immersion 1-clic et minuteur de mise en veille progressif. Intégré dans la barre latérale sous Assistants et dans la palette de commandes (Ctrl+K).
- Modules Alertes Streamers & Casino / Mini-Jeux (v1.55.22 à v1.55.25) : création intégrale de deux centres complets pour le bot Discord : Alertes Streamers (`/discord/streamers`) avec détection multi-plateformes Twitch, YouTube et Kick, filtrage par jeu/viewers, ping configurable et rôle @En Live automatique ; Arène Mini-Jeux & Casino (`/discord/games`) avec Blackjack 21, Roulette Royale, Duels de dés PvP, cagnotte progressive Jackpot et quêtes actives quotidiennes.
- Économie Unifiée Ethone Coins (v1.55.26) : liaison directe de l'arène de jeux au portefeuille et à l'économie officielle du serveur Discord (mode Mises Réelles avec déduction/crédit immédiat du solde, enregistrement dans le journal des transactions du serveur, prélèvement de 1% à 5% vers le jackpot commun, et réclamation des bonus quotidiens).
- Harmonisation Visuelle Native (v1.55.27) : harmonisation méticuleuse des deux pages (`StreamersCenterClient.tsx` et `GamesCenterClient.tsx`) pour respecter fidèlement la charte graphique et la disposition native d'ETHONE (fil d'Ariane, cartes KPI translucides, barre d'onglets de navigation avec transition fluide layoutId, sélecteur de serveur et mode sombre/clair).
- Sélecteur de Serveur Interactif (v1.55.28) : refonte du bandeau de serveur en haut à gauche de la barre latérale Discord (`HubSidebar.tsx`) en un sélecteur interactif animé avec recherche instantanée, liste complète des serveurs, pastille de présence du bot et lien d'invitation directe.
- Ergonomie Discord & Zéro Avertissement de Code (v1.55.29) : navigation au clavier complète (flèches Haut/Bas, Entrée, Échap) et fermeture automatique sur mobile pour le sélecteur de serveur. Résolution de tous les avertissements React hooks (`exhaustive-deps`) et expressions fonctionnelles dans tout le projet (0 avertissement fonctionnel).
- Synchronisation Palette de Commandes & Assistant (v1.55.30) : intégration des modules Alertes Streamers (`/discord/streamers`), Mini-Jeux & Casino (`/discord/games`) et AutoMod natif dans l'index global de la palette de commandes (`DISCORD_MODULES`) avec mots-clés enrichis. Synchronisation des préréglages et groupes de l'assistant d'onboarding (`SetupModulesStep.tsx`).
- Fiabilisation du Sélecteur de Serveurs (v1.55.31) : correction du cycle de réinitialisation dans `HubSidebar.tsx` en dissociant l'initialisation à l'ouverture du bornage du curseur lors de la frappe, assurant une saisie fluide et persistante dans la barre de recherche des serveurs Discord. Bornage dynamique du curseur de navigation clavier.
- Gestionnaire de Fichiers iOS & Android Réel (v1.55.39 à v1.55.41) : parité native avec arborescence dossiers, fil d'Ariane interactif, grille/liste 2 colonnes, favoris Cloud réels (`ethone_file_favorites`), raccourcis d'action contextuels et inspecteur de détails.
- Design System Liquid Glass Avancé iOS & Android (v1.55.42) : reflets spéculaires à réfraction de lumière (`LiquidGlassBorder`), fond lumineux ambiant réactif (`AmbientLuminousBackground`), pilules et dock tactile flottant (`LiquidGlassPill`, `NativeFloatingDock`), bulles de chat Brain, mini-barre Focus, orbe IA (`ETHBrainOrb`) et écrans de connexion et verrouillage.
- Pureté Native iOS 26/27 et Android Material Design 3 (v1.55.43) : élimination de tous les faux dégradés spéculaires manuels sur iOS au profit du framework Apple officiel (`.glassEffect`, `Glass.regular`, `GlassEffectContainer`) ; suppression complète des simulations de verre sur Android (`LiquidGlassSurface`, `AmbientLuminousBackground`) pour adopter 100% l'écosystème Material Design 3 (`Surface`, `FilterChip`, `AssistChip`, élévation tonale, formes standard).
- Dashboard Web & Parité Mobile (v1.55.44) : harmonisation responsive des colonnes Bento (`WIDGET_COL_SPAN`) sur mobile, tablette et desktop ; bouton direct agenda dans l'en-tête du flux du jour et conservation du minuteur Focus même les jours libres ; affichage de 3 notes récentes ; barre de navigation mobile tactile dans l'explorateur de fichiers (`/files`) avec gestion des partages et espaces ; interactivité complète de la chronologie du Centre d'activité (`/activity`) avec inspecteur d'événements et raccourcis rapides.
- Calendrier & Agenda Unifié (v1.55.45) : synchronisation en temps réel des rendez-vous et événements Supabase (`ethone_items`, kind = 'event') avec sélecteur d'heures ou journée entière, titre, lieu et notes dans `CalendarAgendaPanel` ; bascule ergonomique à double volet (Agenda / Factures) avec compteurs dédiés par journée ; fusion unifiée des marqueurs calendaires combinant les pastilles info pour les événements et les logos/statuts financiers pour les factures.
- Filtres de Tâches & Expérience Mobile Notes (v1.55.46) : barre de filtres par catégories (`/tasks`) avec compteurs dynamiques en temps réel par projet et bouton contextuel de réinitialisation des filtres ; refonte adaptative mobile (`/notes`) avec bascule fluide plein écran entre liste et éditeur, bouton de retour dédié et création directe depuis l'en-tête sur mobile.
- Espaces & Gestionnaire de Flows (v1.55.47) : alignement responsive des onglets d'espaces (`/spaces`) éliminant les décalages de marges sur smartphone et tablette ; indicateur de chargement dédié et écran d'erreur clair avec bouton de retour sur l'inspecteur d'espace (`/spaces/[spaceId]`) ; barre de création unifiée du gestionnaire de flows (`/flows`) intégrant le sélecteur de modèle et le champ de nom personnalisé.
- Refonte de la page Bot Etho Protect (v1.55.48) : refonte intégrale de la page bot (`/bot`) inspirée de la disposition et de l'UX de Keeper Protect, adaptée à l'identité visuelle d'Etho (obsidian sombre, accents vert émeraude). Hub de serveurs 3 colonnes avec barre latérale (déclencheur palette Ctrl+K, navigation, liens support/documentation, profil utilisateur), fil d'Ariane et statut de synchronisation, partitionnement automatique des serveurs Discord (« Avec Etho » avec bouton Gérer / « Sans Etho » avec bouton Installer 1-clic direct), recherche instantanée, carte latérale « Bots privés » avec modal interactif complet, et bascule réversible persistée en localStorage vers l'ancienne vitrine publique pour réversibilité totale.
- Refonte de la Console Discord ServerPicker (v1.55.49) : refonte intégrale de la sélection de serveur Discord (`/discord` quand aucun serveur n'est choisi) avec le format 3 colonnes Keeper Protect adapté au design system Etho. Partitionnement en temps réel des serveurs connectés (« Avec Etho » menant au dashboard du serveur via `onPick` / « Sans Etho » avec bouton d'installation 1-clic), recherche réactive, filtre « Gérables », volet « Bots privés » avec modal interactif complet, et bascule réversible instantanée vers la vue classique centrée conservée à 100%.
- Écran d'installation Bot Discord & Auto-Détection (v1.55.50) : intégration du flux d'installation guidé complet reproduisant fidèlement le mockup Keeper Protect lors du clic sur un serveur sans le bot Etho (que ce soit depuis `/discord`, `/bot` ou en accès direct via paramètre `?guildId=`). Barre latérale contextuelle avec pastille de statut « Etho absent », carte active du serveur et raccourcis navigation/support. Conteneur central présentant les 3 étapes d'onboarding Discord (Ajout du bot avec permissions requises, placement du rôle au sommet de la hiérarchie, détection de présence en temps réel). Intégration de l'auto-détection en polling toutes les 3,5s, d'un bouton de vérification manuelle « Vérifier » et d'un bouton d'échappement « Passer l'attente » pour accéder directement à la configuration du serveur sans bloquer l'utilisateur. Tests unitaires (Jest) et E2E (Playwright) validés.

- Session du 2026-10-08 (v1.55.68) : fausses données retirées de la console Discord (Casino, scan, compteurs, configuration assistée, « Just Chatting »), Casino calculé par le bot, vrai scan de sécurité, vrai mode raid, message d'arrivée privé façon Keeper, règles d'accès des espaces partagés réparées (elles plantaient en récursion infinie) et migration appliquée, bot redéployé sur le VPS (il tournait sur le code du 5 octobre).

## Reste à faire (par priorité)
1. **Pages de la console Discord qui « ne fonctionnent plus trop »** : l'utilisateur doit donner la liste. Pour chaque page : ouvrir dans Chrome, lire les requêtes vers `bot.ethone.dev` (un 404 = route absente ou bot pas redéployé, un 401 = session du bot expirée, `components/discord/BotSessionGate.tsx` (monté par `app/discord/layout.tsx`) affiche alors la page « Connecte-toi avec Discord », ou `credentials: "include"` manquant), corriger.
2. **Parité Keeper, à vérifier en vrai** : vue d'ensemble (« À régler », score du dernier scan, rôles sensibles, activité récente) et scan complet + scan automatique faits en 1.55.71 (bot : `discord-bot/src/modules/server/services/securityScanService.ts`, données dans `data/security_scans.json`, rapport toutes les 15 min au plus si dû ; site : `lib/discord/security-scan.ts`). Après reconnexion de l'utilisateur, lancer un scan, activer le scan automatique sur un salon de test et vérifier le premier rapport. « Protections sans salon de log » : `GET /server/log-coverage` (même routage que les vrais envois, `DiscordLogService.destinationFor`), affiché dans « À régler » et la barre latérale.
3. **Bot animé et message d'arrivée, vérification réelle** : dans un vrai salon, vérifier les émojis animés des réponses, la carte GIF d'arrivée d'un membre, et inviter le bot sur un serveur de test pour voir le salon privé `etho-bienvenue`.
4. **Synchronisation** : faire tester par l'utilisateur sur deux appareils (changer le statut sur l'un, il doit apparaître sur l'autre sans recharger).
5. **Supabase** : la protection des mots de passe divulgués apparaissait encore désactivée après activation par l'utilisateur (peut demander l'offre Pro).
6. **Alertes streamers** : Twitch passe par decapi.me (service tiers non officiel, sans clé). Fragile : passer à l'API Twitch officielle (secrets `TWITCH_CLIENT_ID/SECRET` existent déjà côté worker) si les alertes ratent.
7. **Qualité** : 0 erreur de lint (avertissements `<img>` attendus en export statique). Quelques tests du bot échouent uniquement sous Windows (assertion libuv à la fermeture) ; la CI Linux est verte.
8. **Autre appareil de l'utilisateur** : un ancien client recréait des notifications « Nouveau mail » en double ; le déclencheur SQL `ethone_strip_legacy_mail_notifications` les nettoie, mais il faut que l'utilisateur ouvre ETHONE sur cet appareil pour qu'il se mette à jour.
9. **Application iOS & Android** : builds CI automatisés (`.github/workflows/build-ios.yml` et `build-android.yml`) ; parité profil/avatars/émojis réalisée en v1.55.16. Tests sur appareil physique à réaliser par l'utilisateur lors du déploiement TestFlight.
