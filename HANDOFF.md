# ETHONE — passation & nouveautés (2026-10-15, version 1.75.109)

## Projet
- `ethone-next/` : site Next.js statique (ethone.dev, Cloudflare Pages, déploiement auto au push sur `main`).
- `ios/` : application native iOS (SwiftUI, XcodeGen, architecture Liquid Glass, build IPA Xcode 27 via GitHub Actions).
- `android/` : application native Android (Kotlin / Gradle).
- `discord-bot/` : bot Etho (VPS `ssh vps`, pm2 `ethone-bot`, dossier `~/dashboard`).
- `worker/` : Cloudflare Worker `raspy-fog-bf5b` (`npx wrangler deploy` depuis `worker/`, tests `node --test test/*.test.mjs`).
- Supabase : projet `bvgifyzhpzkbrwdjrqsg` (tables mail = `ethone_mail_*`, sauvegardes `bot-backups`).

## Règles à respecter
- Commits : `git -c user.name="Rub19" -c user.email="rub19.mailpro@gmail.com" commit …`, message « Migration Next.js : vX - … » ou « Migration Next.js : description », **sans co-auteur IA**.
- Ne jamais committer `discord-bot/scripts/etho-avatar-animated.gif` ni `.mcp.json`.
- Pas de données inventées ni de placeholders dans le dashboard. Seuls les réglages que le bot applique vraiment sont affichés.
- **Politique stricte zéro commentaire** : aucun commentaire (`//`, `/*`, `///`, `<!-- -->`) dans le code source créé ou modifié.
- Refuser les secrets collés dans le chat ; ne jamais taper d'identifiants sur un site.
- Déploiements autorisés (« je te laisse tout faire ») : les annoncer ; sauvegarder les données du bot avant chaque déploiement bot.
- Rapports finaux en français.

## Commandes utiles
- Release site : `cd ethone-next && node scripts/release.js <ver> <date> <json>` (JSON `{fr,en,es,de:{title,items[]}}`), puis `npm install --package-lock-only`, synchroniser `public/version.json` et la 1re ligne de ce fichier. Vérifs : `npx tsc --noEmit`, `npm run lint`, `npm run test:unit`, `npm run build`, `node scripts/audit-security.mjs` et `node ./scripts/precommit-upload-check.mjs` (depuis la racine).
- Attendre le site : `until curl -s https://ethone.dev/version.json | grep -qF <ver>; do sleep 10; done`
- Déploiement bot :
  `ssh vps 'cp -r ~/dashboard/discord-bot/data ~/backups/data-$(date +%Y%m%d-%H%M) && cd ~/dashboard && git checkout -- discord-bot/package-lock.json; git pull -q origin main && pm2 restart ethone-bot >/dev/null && sleep 25 && pm2 logs ethone-bot --lines 60 --nostream 2>&1 | grep -iE "Connecté avec succès" | tail -1'`
- Tests bot : `DISCORD_TOKEN=ci-placeholder-token CLIENT_ID=000000000000000000 npx tsx tests/<fichier>.ts` ; typecheck `npx tsc --noEmit -p .`.

---

## Nouveautés majeures & Réalisations récentes (v1.75.83 → v1.75.115)

### Sanctions façon Keeper (v1.75.115)
- Circuit unique `modules/moderation/services/sanctionPipeline.ts` (`applySanction` : dossier → MP avec appel → action Discord ; `onCaseCreated` : paliers + garde-fou ; `recordDiscordSanction` via audit log ; `remindEnd`). Les commandes /warn /timeout /kick /ban(/durée) /unban /untimeout passent par `commands/sanctionRunner.ts` ; nouvelle commande `/mod` (raisons prédéfinies). L'ancien `sanctions.json` n'est plus écrit, seulement lu dans l'historique.
- Réglages `modules/moderation/sanctionConfig.ts` (`data/sanction_config.json`) : tiers, warnings, replies, history, guard, presets, appeals. Appels `services/appealService.ts` (`data/appeals.json`). Historique arrivées/départs/pseudos chiffré `storage/memberEvents.ts` (`data/member_events.enc`, 90 j). La protection crée des dossiers SECURITY (regroupés 10 min).
- API `/api/guilds/:id/sanctions/*` (`server/routes/sanctionsRoutes.ts`) ; signalements étendus (`reportsConfig.ts`). Pages console : ConsoleSanctions, ConsoleWarnings, ConsolePresets, ConsoleReportsKeeper, ConsoleAppeals, ConsoleModStats (+ `console/sanctions/shared.tsx`).

### Bienvenue et départs + Rôles automatiques façon Keeper (v1.75.111)
- Sidebar (`HubSidebar.tsx`) en sections data-driven : Protection, Accueil des membres, Sanctions, Modération, Accès, Animation, Serveur. Vues console `welcome` et `autoroles`.
- `ConsoleWelcome.tsx` + `console/welcome/*` (MessageEditor, DiscordPreview, ImageEditor à calques, types/modèles). Bot : `welcomeService.ts` réécrit (format embed/container/text, `asServer` via webhook, ghost ping, options waitVerification/ignoreBots/quickLeave, vague limitée à 10/min), rendu `renderLayered` (GIF animé via `renderAnimatedCard` + `paintBase` si `animated`), upload `POST /welcome/assets` → `data/welcome-assets/` servi par `GET /api/public/welcome-assets/:guild/:file`.
- `ConsoleAutoRoles.tsx` ; bot `autoRoleConfig.ts` `temp` (persisté dans `data/temp_roles.json`, tick 60 s) et `voice` (voiceStateUpdate).

### /server + compteur de badges (v1.75.110)
- Bot : `modules/serverInfo/` (`badgeScanner.ts` scanne `guild.members.fetch()`, cache 10 min ; `serverCommand.ts` pages Aperçu/Membres/Salons & rôles/Badges, menu `srv:<userId>`).
- API `GET /api/guilds/:guildId/badges` (`?refresh=1` force le scan). Dashboard : onglet « Badges » de `ConsoleServer.tsx`.
- Icônes `public/bot-icons/badge_*.png` → emojis d'app `etho_badge_*`. Scan via REST brut (`Routes.guildMembers`) : Nitro = avatar animé, bannière (GET /users/:id, 500 max), `display_name_styles` ou profil de serveur. Palier Nitro et badge Quête invisibles. Panel console : `focus-within:z-30` + `has-[aria-expanded]` pour que les menus passent au-dessus.

### Musique : état des sources (v1.75.109, vérifié le 2026-10-15)
- Accès SSH au NAS par clé OK (`ssh nas`, port 46 ; pas de SFTP : copier avec `cat fichier | ssh nas "cat > …"`). Docker sans sudo. Conteneurs : `lavalink` (ghcr 4.2.2, lavaplayer 2.2.6, net host, config ~/lavalink/application.yml), `yt-resolver`, tunnels autossh.
- SoundCloud cassé côté SoundCloud (« Did not detect any supported formats »), même avec Lavalink dev / lavaplayer 2.2.7 testé. Bandcamp `bcsearch` renvoie vide. Deezer écarté (plugin = clé de déchiffrement).
- `yt-resolver` (discord-bot/lavalink/yt-resolver/resolver.py) : `player_client android/web` forcés ne donnaient plus aucun format ; retirés (clients par défaut de yt-dlp = Opus 251). Copie NAS sauvegardée en resolver.py.bak-20261015. Vérifié : resolve OK puis Lavalink charge la piste.

### Page Protections façon Keeper (v1.75.108)
- `ConsoleProtections` : colonne gauche (recherche, catégories + compteurs, carte « Protections actives »), filtres, cartes par catégorie (`CATEGORY_META`, « Tout activer/désactiver »), clic sur une ligne = `Detail` existant avec retour.
- Catalogue (bot) : 50 protections, catégories alignées sur Keeper (Membres remplace Arrivées, Modules supplémentaires répartis). Nouvelles : `antiUnban` (MemberBanRemove → reban), `antiEvent` (GuildScheduledEvent* → supprime/revert/recrée), `antiMemberRename` (MemberUpdate nick par un tiers → remet l'ancien), `antiMessageDelete` et `antiReactionRemove` (réglage `watchedChannels`, obligatoire = À compléter). Rien n'est Premium chez Etho.

### Page /bot/connexion + reconnexion bot silencieuse (v1.75.106)
- `components/botsite/BotLogin.tsx` (route `/bot/connexion`) : modèle Keeper aux couleurs Etho (langue, thème clair/sombre, Discord via Supabase). Le bouton Dashboard de /bot y mène si pas de session Discord, sinon `/discord`.
- Session bot : le cookie `token` (7 j, Secure, SameSite=None) disparaît côté navigateur au bout d'environ 30 min selon l'utilisateur (cause non reproduite). `BotSessionGate` relance une fois `/api/auth/login?silent=1` (Discord `prompt=none`) ; en cas de refus, le callback renvoie vers la page avec `bot_auth=failed` et l'écran de reconnexion s'affiche.

### Panneau de présence owner en Components V2 (v1.75.105)
- `modules/presence/ui/discordOwnerPanel.ts` réécrit : `buildPanel(notice?)` (V2) remplace `buildPanelEmbed`/`buildActionRows` ; boutons statut (dont Invisible), Mode streamer et Activité perso via modales `owner_presence_modal_*` (routées dans interactionCreate), rotation, maintenance. Choisir une activité arrête la rotation (sinon elle l'écrase). `/status` utilise le même panneau.

### Tests réels + autocomplétion (v1.75.104)
- Testé sur Serveur Test Bot (modules activés puis remis désactivés) : bienvenue (message + carte OK), giveaway 1 min (participation, tirage, annonce OK), ticket (ouverture, fermeture, salon supprimé OK), /play sans vocal (message clair), streamers (lofigirl détecté en live via decapi.me, puis retiré).
- Corrigés : `/bienvenue test` affichait <#null> ; `/streamer add` affichait « none » ; SW v423 : les payloads RSC (`*.txt`) passent en réseau d'abord (sinon navigation sur une ancienne version).
- Autocomplétion : streamer remove (filtrée par plateforme), giveaway end/reroll/cancel/extend, reminder cancel (rappels du membre), poll (id), economy buy.
- NON RÉSOLU : Lavalink (NAS, 4.2.2 / lavaplayer 2.2.6) : `scsearch` échoue, `ytsearch` marche. Mettre à jour Lavalink sur le NAS (pas d'accès SSH par clé). Sauvegarde/restauration non testées (session bot du dashboard expirée).

### Fausses données, tutoiement, invitation, SEO /bot (v1.75.103)
- Coach Valorant : « — » / « ton agent principal » au lieu de 25 %/50 %/Jett/10 parties. Moteur IA intégré : règlement et salon #support inventés retirés.
- `ticketRepository` : défauts = une catégorie « Support » sans équipe, aucune équipe ni automatisation (les serveurs déjà initialisés gardent leurs données).
- Tout au « tu » sur /bot (FR) et dans la console. `ConsolePage` : `xl:max-w-5xl 2xl:max-w-6xl`.
- Invitations : `permissions=1436565368055` (liste précise au lieu d'Administrateur) ; le lien de secours du Bouclier Owner garde Administrateur.
- `app/loading.tsx` supprimé : il enveloppait toutes les pages dans un Suspense (contenu livré dans `<div hidden id="S:0">`). `loading.tsx` vides gardés seulement dans discord, activity, connections, leaderboard, settings, tracker (useSearchParams sans Suspense).

### Spotify + fiabilité bot (v1.75.102)
- Île : ±15 s, copier/ouvrir le lien Spotify, Espace/←→/↑↓ quand la vue Spotify est ouverte. Dock : ligne de temps en double retirée (MediaProgress affiche déjà écoulé / restant).
- Échec `deploySlashCommands` → `BotErrorIncidentService` (empreinte + incident critique). `/economy` ne garde que leaderboard/buy ; previous/nowplaying/volume/shuffle/loop/clearqueue ajoutés à `PREFIX_ONLY_SHORTCUTS` (91 commandes slash).
- `release.js` met aussi à jour `discord-bot/package.json` (version du pilotage).


### IA : Groq automatique (v1.75.99)
- `GROQ_API_KEY` est dans `discord-bot/.env` sur le VPS (clé distincte de celle du Worker). Aucun écran ne choisit le fournisseur : `AIProviderService.withAvailableProvider` passe `BUILTIN` → `GROQ` dès que la clé existe ; le modèle devient `GROQ_MODEL` (env) ou `openai/gpt-oss-120b` avec `reasoning_effort: low` (v1.75.100 : `llama-3.3-70b-versatile` est retiré chez Groq, 404). v1.75.101 : Worker (`ai-config.js`, `AI_FALLBACK_MODEL` de wrangler.jsonc, `reasoning_effort: low` pour gpt-oss) et `lib/brain` passés sur `openai/gpt-oss-120b` / `gpt-oss-20b` / `qwen/qwen3.8-27b` (modèles Groq vérifiés le 2026-10-15).
- `/summarize` appelle l'IA (repli sur `AIToolService.summarizeMessages` si la réponse vient du moteur intégré).

### Slash commands : limite de 100 (v1.75.98)
- Depuis le 2026-10-15 09:47, `deploySlashCommands` échouait (`DiscordAPIError[30032]`, 117 commandes > 100) : dernier déploiement réussi le 2026-10-12. `PREFIX_ONLY_SHORTCUTS` (handlers/commandHandler.ts) exclut du déploiement les 20 raccourcis qui doublent `/spotify`, `/fun` et `/lastfm` ; ils restent en préfixe. Surveiller ce total avant d'ajouter une commande slash.

### Doublon /economy balance retiré (v1.75.97)
- Sous-commande slash `balance` retirée de `/economy` (`/balance` reste ; `!economy` sans argument affiche toujours le solde). Les autres raccourcis (`/daily`, `/work`, `/pay`, `/gamble`, `/rob`, `/shop`) doublent encore leurs sous-commandes `/economy`.

### Console : redirections server/*, aperçu niveau, titres FR (v1.75.96)
- `LegacyModuleRedirect` accepte `view` et `tab` ; `/discord/server/{channels,roles,emojis,webhooks,settings}` ouvrent l'onglet (lu par `ConsoleServer` via `?tab=`), `members`/`permissions` → `?view=members`, `audit` → `?view=logs`.
- `EmbedPreview` (leveling) rend le markdown via `MarkdownContent`.
- Titres FR dans `app/discord/page.tsx` et `lib/discord-modules.ts`.
- Commandes testées en vrai sur Serveur Test Bot : `/ping`, `/balance` (pièce etho_coin OK), bouton Quotidien, `/help`, message « module désactivé » (`/ask`). Économie réactivée puis remise désactivée.

### Pièce Etho en émoji d'application (v1.75.95)
- `public/bot-icons/coin.png` (rendu 128 px de `components/icons/EthoCoin.tsx`) devient l'émoji d'application `etho_coin` via `syncAppEmojis` (déjà créé sur l'app).
- `modules/economy/currencyEmoji.ts` : `displayCurrencySymbol` remplace le symbole par défaut (`🪙`, `etho` ou vide) par `etho_coin` dans l'économie et `/casino`. Les embeds Blackjack de `gamesService` gardent 🪙 (titres et pieds d'embed n'affichent pas les émojis custom).

### Console : bandeau de version, doubles requêtes, guildAuth (v1.75.94)
- `useVersionChecker` : le bandeau n'apparaît plus que si la version en attente est plus récente que le build chargé (une version déjà chargée restait « en attente » et le bandeau revenait à chaque page) ; un commit vide ne compte plus comme différent.
- `useGuildApi` (console/kit.tsx) : callback stable (toast via ref) ; avant, chaque changement du contexte de notifications relançait le chargement de tous les modules.
- Bot `guildAuth.fetchUserGuilds` : stale-while-revalidate (cache frais 1 min, servi jusqu'à 10 min pendant le rafraîchissement) + log `[GuildAuth] /users/@me/guilds lent` au-delà de 1,5 s. Les routes sans override owner (tickets, logs) attendaient ~4,4 s.

### Vitrine bot : cartes Plateformes fidèles (v1.75.93)
- `PLATFORM_CONFIGS` (BotLanding.tsx) réécrit d'après les sous-commandes réelles : Instagram/X/TikTok = recherche + aperçu (aucun suivi de flux), Pinterest = recherche + lien Google Lens, Last.fm sans leaderboard, Twitch = alertes Twitch/YouTube/Kick. Les `platforms.items` de `botLandingI18n.ts` ne sont pas rendus.

### Vitrine bot : mobile, partage et textes (v1.75.92)
- Grilles en `grid-cols-1` sous `sm` (le contenu min-content élargissait la colonne à 392px sur 375px) et libellé « Ajouter Etho » masqué sous 400px (le bouton menu sortait de l'écran).
- `metadataBase` ajouté au layout racine (og:image pointait sur localhost), canonical + Twitter card sur `/bot`.
- Carte « Filtres 8D » remplacée par Paroles & Playlists (le bot n'a aucun filtre audio), mention de stockage chiffré retirée de la FAQ.
- Connu : une copie cachée de la page reste dans `<div hidden id="S:0">` (boundary Suspense de streaming non nettoyée) ; invisible mais dupliquée dans le DOM.

### Vitrine bot alignée sur les vraies fonctions (v1.75.90)
- `botLandingI18n.ts` : fonctions inexistantes (TTS, Snipe, Blacktea, traduction, bump, manipulation d'images) remplacées par des vraies (/ask, /ticket, casino, /tag, /reminder, starboard, /imagine, /birthday). Chiffres alignés sur `bot.ethone.dev/api/public/commands` (115 commandes, 20 sécurité, 63 musique).

### Tracker Riot fiabilisé & dépendances (v1.75.89)
- TypeScript à **0 erreur** et `ignoreBuildErrors` retiré de `next.config.ts` : le build échoue désormais sur une erreur de type.
- Coach tactique : `notify()` (inexistant) remplacé par `show()` (reset/copie plantaient), résumés de parties lisant `mapName` / `result`.
- Modale Riot : faux test de latence remplacé par une vérification du format `RGAPI-…` ; la clé est stockée dans `localStorage` `ethone:cred:riot:riotApiKey` (là où `lib/api.ts` la lit) au lieu d'un champ `valorantApiKey` inexistant dans les settings.
- Dependabot : sharp 0.35.5 (override dans `worker/pnpm-workspace.yaml`), overrides `postcss-selector-parser` / `source-map-js` dans `discord-bot/web`.

### Présence du bot sans chaîne imposée (v1.75.88)
- Plus aucun lien Twitch par défaut (site et bot) : le Mode Streamer exige un lien http(s) saisi par l'admin, sinon la présence retombe en « Joue à ».
- Activités de rotation inventées supprimées ; claims non vérifiés (0.2s, « des centaines de communautés ») retirés de la vitrine et de l'onboarding.

### 1. iOS Native : Icône officielle Retina 1024x1024 & Refonte Login Liquid Glass (v1.75.87)
- **Remplacement de l'icône IPA** : Retrait définitif du placeholder Capacitor (croix bleue sur grille blanche) sur l'écran d'accueil iPhone. Remplacement par le logo officiel d'ETHONE en résolution Retina 1024x1024 (`AppIcon-512@2x.png` et `AppIcon.png`) : fond sombre profond `#101018`, contour néon signal multi-teintes (`#8b5cf6` → `#38bdf8` → `#34d399` → `#e11d48`), reflet glass supérieur et monogramme « E » géométrique blanc centré.
- **Refonte de l'écran de connexion (`LoginView.swift`)** :
  - **En-tête officiel** : Remplacement de l'icône générique d'étoiles/sparkles par le composant vectoriel natif `BrandMarkView`, avec titre « Bienvenue sur ETHONE » et sous-titre « Connectez-vous à votre environnement numérique unifié. ».
  - **Sélecteur d'onglets Liquid Glass** : 3 modes identiques au web (« Mot de passe », « Code OTP », « S'inscrire ») avec indicateur rose néon dynamique (`#E11D48`).
  - **Champs & fonctionnalités** : E-mail avec icône enveloppe, mot de passe avec cadenas et bascule œil afficher/masquer, bascule « Rester connecté », lien « Mot de passe oublié ? ».
  - **Bouton d'action signature** : Dégradé rose vibrant (`#E11D48` → `#BE185D`) avec flèche et retour haptique.
  - **OAuth & Clé de sécurité** : Ligne « OU CONTINUER AVEC » avec 3 boutons côte à côte (Google, GitHub, Discord) et bouton d'accès direct Passkey.
- **Support OTP natif (`AuthStore.swift`)** : Implémentation des méthodes `signInWithOtp` et `verifyOtp` pour la connexion par code temporaire sans mot de passe.

### 2. Riot Developer API : Jeton de vérification de domaine & Validation (v1.75.86)
- **Déploiement du jeton de domaine** : Fichier officiel `riot.txt` (`f104ce73-8317-47be-b5db-f4f545213db4`) déployé dans `/tracker/riot.txt` et `/riot.txt`.
- **En-têtes HTTP de conformité** : Ajout de `Content-Type: text/plain; charset=utf-8` et `Access-Control-Allow-Origin: *` dans `_headers` pour la validation automatisée Riot Games.
- **Approbation de domaine** : Validation de propriété réussie sur le portail Riot Games Developer pour l'accès aux APIs de production VALORANT.

### 3. CI/CD : Migration vers Node 24 & Actions GitHub v7 (v1.75.85)
- **Mise à niveau des workflows GitHub Actions** : Migration de tous les workflows (`.github/workflows/`) vers `actions/checkout@v7`, `actions/upload-artifact@v7`, `actions/setup-node@v7`, `actions/setup-java@v6` et `actions/cache@v6`.
- **Élimination des avertissements d'obsolescence** : Suppression définitive de l'avertissement de deprecation Node 20 sur les runners macOS Xcode 27 et Ubuntu.

### 4. Tracker Valorant : Correction bug 1v1 Compare & Audit Navigateur (v1.75.84)
- **Correction bug TDZ (Temporal Dead Zone)** : Résolution de l'exception dans `CompareWithFriendView.tsx` où `hasPlayer2` était évalué avant la déclaration de `p2Profile`/`p2Matches`.
- **Sécurisation défensive** : Null-safety dans `ValorantWeaponStatsCard.tsx`, validation stricte des props du composant `Modal`.
- **Audit navigateur Playwright complet** : Audit automatisé des 10 pages/onglets de `ethone.dev/tracker/` : 10/10 HTTP 200, 0 crash React (`hasCrashBoundary: false`), 0 erreur console non interceptée, 0 fuite de placeholders.

### 5. Accès Hybride : Portail Principal sous Login & Tracker Public Libre (v1.75.83)
- **Racine `ethone.dev/` sous login** : Redirection automatique des utilisateurs non authentifiés vers `https://ethone.dev/login/`.
- **Libre accès au Tracker** : `https://ethone.dev/tracker/` et `/matches/` restent 100% ouverts et accessibles sans compte pour les joueurs et les reviewers Riot.

---

## Nouveautés antérieures (v1.73.0 → v1.75.37)

### Vitrine Bot : Bouton Retour en Haut Flottant et Footer 3 Colonnes Style Bleed (v1.75.37)
- **Bouton Flottant Circulaire** : Ajout d'un bouton circulaire en bas à droite (`ArrowUp`) qui s'affiche automatiquement dès que le défilement dépasse 200px et permet de remonter en haut de page en douceur avec animation Framer Motion.
- **Footer 3 Colonnes Style Bleed** : Refonte totale du bas de page en grille 3 colonnes :
  - Colonne 1 : Logo Etho, Copyright © 2026 etho.dev, Tous droits réservés, et VersionPill.
  - Colonne 2 (Bot) : Liens Inviter, Documentation, Support Discord et Dashboard.
  - Colonne 3 (Légal) : Conditions d'utilisation, Confidentialité, Cookies, Mentions légales et bouton Paramètres des cookies.
- **Suppression du Slogan Inférieur** : Retrait définitif de « Le bot Discord tout-en-un pour votre communauté » du bas de page.

### Vitrine Bot : Épuration du Hero et Retrait des 3 Badges (v1.75.36)
- **Hero Épuré** : Suppression des 3 badges secondaires sous les boutons d'appel à l'action (« Anti-Raid 0.2s », « Pont vocal Spotify », « Zéro latence ») dans `BotLanding.tsx`.
- **Impact Visuel** : Mise en valeur directe des boutons d'action (« Ajouter le bot », « Ouvrir le dashboard ») et du simulateur Discord interactif sans distractions textuelles superflues.

### Rétablissement du Bouton Retour au Dashboard pour les Utilisateurs ETHONE OS (v1.75.35)
- **Rétablissement Multisupport** : Réintégration complète du lien et bouton « Retour au dashboard » pour les utilisateurs disposant d'un compte ETHONE OS (détecté via session Supabase, profil de compte, jetons locaux ou domaine hôte `ethone.dev`).
- **Barre Latérale & Sélecteur de Serveurs** : Ajout du bouton « Retour au dashboard » avec icône fléchée sous « Mes serveurs » dans `HubSidebar` et dans `ServerPicker`.
- **En-tête & Pastille Flottante** : Ajout du raccourci dans la barre d'en-tête de la console Discord aux côtés de la pastille de sauvegarde et en pastille flottante en bas à droite de l'écran avec nettoyage de l'état de session Discord sélectionné.
- **Internationalisation Complète** : Traduction de la clé `dReturnToDashboard` en français, anglais, espagnol et allemand.

### Sélecteurs Déroulants Sur-Mesure Obsidian / Keeper (v1.75.34)
- **Nouveau Composant `Select` Déroulant** : Création d'un composant de sélection sur-mesure dans `ethone-next/components/discord/console/kit.tsx` avec bordures fines, fond de surface sombre, icône fléchée animée, popover animé via Framer Motion (`SPRING_LAYOUT`), coche d'activation (`Check`) et fermeture au clic extérieur.
- **Remplacement Global des `<select>` Natifs** : Élimination de 100 % des balises `<select>` natives du navigateur dans la console Discord (`ConsoleStreamers`, `ConsoleLeveling`, `ConsoleVoice`, `ConsoleServer`, `ConsoleSettings`, `ConsoleLogs`, `ConsoleCommands`, `ConsoleEvents`, `CustomCommandEditor`, `FormEditor`, `ConsoleProtections`), supprimant les fenêtres grises/blanches système et la surbrillance bleue agressive.
- **Navigation au Clavier Complète** : Prise en charge des touches `Échap` (fermeture), `Flèche bas` / `Flèche haut` (navigation dans les options) et `Entrée` (sélection).
- **Tailles & Alignements Précis** : Support des variantes `size="md"` (hauteur standard 36px) et `size="sm"` (hauteur compacte 32px pour filtres et actions), avec alignement dynamique `left` ou `right`.

### Économie : Pièce Officielle Etho, Sélecteur de Devises & Import Personnalisé (v1.75.33)
- **Pièce Custom Officielle Etho (Défaut)** : Création d'une pièce dorée vectorielle avec frappe haute définition du sceau Etho, reflets métalliques, tranche cannelée et fond chaud, configurée comme monnaie native par défaut sur tout le dashboard et le bot.
- **Sélecteur de Devises Interactif** : Panneau de choix complet permettant aux administrateurs de choisir entre la pièce Etho, 12 presets d'emojis populaires (pièce, diamant, bourse, étoile, cookie, éclair, couronne, trèfle, flamme, etc.) et une saisie libre d'emojis ou codes Discord personnalisés (`<:nom:id>`).
- **Importation de Fichier Personnalisé & URL** : Zone de glisser-déposer et sélecteur de fichier acceptant les images transparentes (PNG, SVG, WebP, JPG) et les URL directes, avec aperçu en temps réel aux côtés d'un solde et bouton de restauration en 1 clic de la pièce Etho officielle.
- **Rendu Visuel Unifié** : Composant `CoinBadge` dynamique affichant la pièce active sur tous les soldes, classements, compteurs de volume et circulation, prix de la boutique et parties de casino.

### Lecteur Musique : Remplacement du Carré Vide par un Vinyle Stylisé (v1.75.32)
- **Design Vinyle Apaisant** : Remplacement du bloc noir/carré vide stressant par un visuel de disque vinyle soigné avec jaquette, sillons et macaron central orné d'une note de musique (`Music`).
- **Animation de Rotation Réactive** : Rotation fluide à 360° du disque vinyle (`animate-[spin_6s_linear_infinite]`) lorsque de la musique est en cours de lecture, et repos élégant et statique à l'état inactif (« Rien en cours »).
- **Interaction et Robustesse** : Clic direct sur le visuel pour focaliser immédiatement le champ de recherche de titre (`searchInputRef`), et gestion d'erreur `onError` avec repli élégant pour toute miniature manquante ou corrompue dans le lecteur et la liste de résultats.

### Mode Streamer & Pastille Violette Bot Discord (v1.75.31)
- **Sélecteur de statut visible étendu** : Ajout du 5e statut « Mode Streamer » dans la section « 1. Statut Visible sur Discord » avec pastille violette (`bg-purple-500`) et icône de lecture en direct.
- **Synchronisation automatique de l'activité** : Le choix du Mode Streamer active automatiquement l'activité de type `Streaming`, charge l'URL de live Twitch par défaut (`https://www.twitch.tv/ethone`) et met à jour l'aperçu du profil du bot (pastille violette avec triangle de diffusion).
- **Compatibilité Gateway & Bot** : Gestion transparente dans `PresenceService` (mappage sur la Gateway Discord avec `ActivityType.Streaming`), support dans la commande `/status` avec choix « 🟣 Mode Streamer » et statut dans le panneau d'administration.

### Documentation Etho : Sidebar Transparente Style Keeper, Catalogue 50 Commandes & 100% Inclus (v1.75.30)
- **Alignement de marque** : Dénomination exclusive « Etho » dans l'en-tête, le hero et le footer (suppression de « Etho Protect »).
- **Sidebar transparente style Keeper** : Suppression intégrale du fond encadré de la barre latérale pour une intégration directe sur fond obsidian (`#090d0b`), recherche intégrée en tête et arborescence continue sur rail vertical sans compteurs numériques ni bordures superflues.
- **Catalogue complet des 50 commandes** : Section interactive dédiée listant l'ensemble des commandes d'Etho (Sécurité, Modération, Configuration, Musique, Spotify, Utilitaires, Fun) avec filtre instantané par catégorie, recherche temps réel, syntaxes, sous-commandes et copie en 1 clic.
- **Élimination de tout placeholder payant** : Retrait définitif de toutes les mentions et badges « Ultra », « Premium », « Essentiel » et « Recommandé ». Etho n'a aucun abonnement payant et tout est 100% inclus pour chaque serveur.

### Sélecteur de Profil et Multi-Compte dans le Menu Utilisateur (v1.75.29)
- **Sélecteur de profil direct** : Ajout d'un tiroir interactif « Changer de profil » directement dans `UserProfileDropdown` affichant le profil actif en badge et listant tous les profils configurés avec puce de couleur d'accent et indicateur d'espace.
- **Bascule en 1 clic** : Changement instantané avec synchronisation réactive des paramètres via `useActiveProfile` et confirmation par toast sans rechargement de page.
- **Prise en charge multi-compte** : Mémorisation des comptes connectés (`ethone_saved_accounts`), affichage des avatars/identifiants et bascule fluide entre comptes enregistrés.
- **Raccourcis intégrés** : Accès direct à la gestion des profils (`/profile-selection`) et à l'ajout de compte (`/login?switch=1`).

### Documentation Etho : Refonte style Keeper & Harmonisation de Marque (v1.75.28)
- **Harmonisation globale de la marque** : Remplacement de « Etho Protect » par « Etho » dans toute la documentation (`/docs`, `/documentation`), métadonnées OpenGraph et barre latérale de gestion de serveurs (`HubSidebar`).
- **Thème sombre inspiré de Keeper** : Fond obsidian sombre `#090d0b`, surfaces de cartes `#0d1410`, bordures fines `#18231c` et accents vert émeraude `#22c55e`.
- **Barre latérale gauche élargie & Rail continu** : Largeur généreuse (`w-76 xl:w-80`), champ de recherche `Rechercher…` en tête avec raccourci Ctrl+K, arborescence à rail vertical continu avec indicateur actif vert, catégories de modules interactives avec navigation fluide et bandeau d'appel à l'action final.

### Refonte Musique, Bento Features & Commandes sur Demande (v1.75.27)
- **Visualiseur spatial 8D & Deck physique** : Balayage horizontal continu avec badges ON/8D, paquet de cartes superposées avec flou de profondeur (POWER - Kanye West) et anneaux Spotify concentriques.
- **Grille de 12 fonctionnalités** : Halo flottant de 7 icônes en arche et cartes concrètes sans jargon.
- **Catalogue sur demande** : Séparateur et bouton de déploiement à la demande évitant tout défilement forcé.

### Stabilisation Carte Spotify & Hauteur d'Égaliseur (v1.75.26)
- Hauteur fixe `h-5` (20px) éliminant tout soubresaut vertical dans le simulateur Discord.
- **Rétablissement officiel de la vitrine sur `/bot`** : accessible directement sur `discord.ethone.dev/bot` et `ethone.dev/bot` avec métadonnées OpenGraph complètes et sans redirection cassée.
- **Motion design inspiré de MultiBot et Keeper Protect** : esthétique sombre satinée (`#07080d`), halos cyan glacé `#92C8D2`, cartes en verre dépoli et spring transitions.
- **Ton sobre et direct sans jargon IA** : élimination complète des formulations artificielles ("console d'élite", "IA ultime") au profit d'un texte clair, direct et orienté communauté.
- **Simulateur de chat Discord interactif en direct** : 4 scénarios cliquables (Anti-Raid avec sanction 0.2s, Spotify avec vinyle tournant et vagues sonores, Suite Fun & Médias avec paroles défilantes, et Bienvenue avec rôles automatiques).
- **Grille bento interactive 6 modules** : commutateurs de sécurité ON/OFF interactifs en direct (Anti-Spam, Bouclier Owner, Anti-Nuke, Pont Spotify), cartes visuelles et exemples concrets.
- **Bandeau défilant des communautés partenaires** et compteurs réels animés (`CountUp`).
- **Prise en main en 3 étapes claires**, catalogue de commandes avec recherche, filtres et copie de syntaxe en 1 clic.
- **Section FAQ interactive** avec accordéons repliables et bannière d'invitation finale.

### Catégorie Fun & Divertissement : Suite de Commandes Fun & Médias & Studio Dashboard (v1.75.1)
- **Suite complète de commandes interactives pour Etho** : 8 commandes Discord dédiées (`/lyrics`, `/quote`, `/image`, `/duckduckgoimage`, `/reverseimage`, `/tvshow`, `/movie`, `/game`) et commande d'aiguillage `/fun <subcommand>`.
- **Recherche de paroles en direct (`/lyrics`)** : Moteur LRCLib gratuit sans clé, support des requêtes artiste + titre, affichage des paroles synchronisées ou brutes, durée et pochette d'album.
- **Générateur de citations stylisées (`/quote`)** : Rendu esthétique instantané aux couleurs de Discord avec support des auteurs, texte et date.
- **Recherche visuelle & Recherche inversée (`/image`, `/duckduckgoimage`, `/reverseimage`)** : Recherche d'images haute résolution via Wikimedia Commons et génération de liens profonds directs vers Google Lens, Bing Visual Search, TinEye, Yandex et SauceNAO.
- **Bases culturelles en temps réel (`/tvshow`, `/movie`, `/game`)** : Requêtes en direct sur TVMaze (séries TV), Wikipédia REST API (films), CheapShark & Steam (jeux vidéo avec réductions, évaluations et prix).
- **Module Dashboard Fun interactif (`/discord?view=fun`)** :
  - Catalogue interactif : cartes sombres avec badges d'arguments et permissions `none`, bouton de copie en un clic avec animation de coche.
  - Studios interactifs en direct : onglets Paroles, Citations, Recherche d'images, Recherche inversée, Cinéma & Séries et Jeux vidéo sans aucun placeholder ni fausse donnée.
- **Zéro commentaire & zéro placeholder** : Conforme aux règles strictes du projet (0 commentaire dans le code source, données 100 % réelles).

### Intégration Complète Spotify : Commandes Bot & Dashboard Interactif Motion (v1.75.0)
- **Suite de commandes Spotify pour le bot** : 20 commandes slash et préfixes (`/spotify nowplaying`, `play`, `pause`, `resume`, `next`, `previous`, `seek`, `volume`, `repeat`, `shuffle`, `queue`, `like`, `unlike`, `toptracks`, `topartists`, `device`, `devices`, `vc`, `login`, `logout`) avec raccourcis directs.
- **Pont vocal Discord (`/spotify vc`)** : diffusion directe du titre Spotify en cours d'écoute dans le salon vocal Discord du membre via le lecteur audio Etho.
- **Boutons interactifs Discord** : commandes directes depuis l'embed d'écoute avec boutons Précédent, Lecture/Pause, Suivant, Like/Unlike et Diffuser en vocal.
- **Module Dashboard Spotify immersif (`/discord?view=spotify`)** : vinyle animé en rotation Framer Motion, égaliseur sonore dynamique 5 bandes, barre de progression interactive et curseur de volume temps réel.
- **Zéro placeholder & actions réelles** : recherche et ajout à la file d'attente, transfert d'appareil actif, gestion des favoris et statistiques de morceaux et artistes préférés.

### Console Discord : Résolution du blocage sur /bot et suppression de l'ancien dashboard (v1.74.18)
- **Suppression du dashboard fantôme** : Retrait définitif de `EthoProtectDashboard.tsx` qui bloquait l'affichage (« Bonjour Compte », 0 serveur et écran noir).
- **Redirection instantanée vers la console officielle** : `https://discord.ethone.dev/bot` et la racine de `discord.ethone.dev` redirigent immédiatement vers `/discord`.
- **Expérience unifiée & connectée** : Affichage direct de la session Discord sécurisée (BotSessionGate), des vrais serveurs en grille moderne à 3 colonnes et de la détection de présence.

### Bouclier Owner : Défilement fluide de la page et épuration des libellés (v1.74.17)
- **Défilement restauré** : Intégration du conteneur `os-scroll` et déverrouillage de la hauteur sur `/discord/owner-shield` et `/owner/shield` permettant de faire défiler l'intégralité de la console et des serveurs surveillés sans blocage ni coupure.
- **Nettoyage des formulations artificielles** : Suppression des mentions « Console d'élite » et « inviolable » au profit de libellés sobres et professionnels (« Protection Propriétaire », « Rétablissement automatique de vos rôles »).
- **Espacement bas optimisé** : Ajout d'une marge de défilement inférieure (`pb-36`) évitant toute collision avec le bouton flottant de retour et le dock.

### Bouclier Owner : Extinction en cascade des serveurs surveillés (v1.74.16)
- **Extinction synchronisée des serveurs** : Lorsque le bouclier principal est désactivé au sommet de la page, tous les commutateurs de la grille « Serveurs surveillés » basculent immédiatement en inactif (OFF, grisés).
- **Statut et filtres alignés** : Chaque carte de serveur affiche désormais « Bouclier coupé » en gris neutre, le compteur de serveurs couverts passe à `0 / [total]` et l'onglet filtre passe dynamiquement en `Inactifs ([total])`.
- **Réactivation intelligente par serveur** : Tenter d'activer la surveillance sur un serveur individuel alors que le bouclier maître est coupé réenclenche automatiquement le bouclier principal et sécurise immédiatement le serveur ciblé.

### Généralisation de la vue moderne & suppression définitive de la vue classique (v1.74.15)
- **Suppression du mode classique** : Retrait complet de l'ancienne vue mono-colonne dans `ServerPicker.tsx`, des composants obsolètes (`ClassicAvatar`), des styles et classes CSS obsolètes (`rowClass`, `discordBtn`) et des branches conditionnelles de secours.
- **Vue moderne en standard unique** : La grille responsive en 3 colonnes (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) avec en-tête d'accueil personnalisé (`Bienvenue, [Nom]`), cartes compactes et statut d'installation en direct est désormais le standard unique et permanent.
- **Suppression des bascules** : Retrait du bouton `Vue classique` dans l'en-tête bureau et du bouton `Classique` sur mobile, ainsi que du commutateur `Voir l'ancienne vitrine` dans le dashboard bot.
- **Allègement du bundle** : Nettoyage de plus de 250 lignes de code mort et d'icônes obsolètes pour des performances accrues.

### Discord AutoMod natif format Keeper (v1.74.14)
- **Navigation latérale** : Ajout de la catégorie `AutoMod` sous la section `Protection` de `HubSidebar.tsx` avec icône Filter émeraude, sélection active et fil d'Ariane synchronisé (`app/discord/page.tsx`).
- **Vue liste fidèle à Keeper** : 6 règles standard intégrées sans aucun placeholder :
  1. `ETHONE • Protection Anti-Phishing Nitro` (Mots-clés · 7 mots-clés · bloque)
  2. `ETHONE • Liens et Pub non autorisés` (Mots-clés · 2 mots-clés · bloque)
  3. `ETHONE • Mots-clés malveillants` (Mots-clés · 5 mots-clés · bloque)
  4. `ETHONE • Grossièretés & Insultes` (Listes de Discord · 3 listes · bloque)
  5. `ETHONE • Spam de Mentions` (Mentions de masse · plus de 7 mentions · bloque)
  6. `ETHONE • Détection Anti-Spam` (Spam · bloque)
- **Commutateurs actifs en ligne** : Bascule immédiate ON/OFF branchée sur `PATCH /automod-native/:id/toggle`.
- **Éditeur de règles complet** :
  - Onglets Déclencheur : `Mots-clés`, `Mentions`, `Spam`, `Listes de Discord`.
  - Gestion par puces/chips interactives des mots-clés avec compteurs de quotas Discord (1000 mots, 10 regex, 100 exceptions) et saisie assistée (Entrée / virgule).
  - Stepper pour la limite de mentions et switch détection des raids.
  - Interrupteurs pour les 3 listes natives Discord (Grossièretés, Sexuel, Haine).
- **Simulateur de test temps réel** : Champ d'évaluation en direct vérifiant si un message saisi déclenche la règle (bannière rouge bloquée avec motif détecté / bannière verte autorisée).
- **Actions, sanctions & exceptions** : Message de blocage personnalisé (150 car.), salon d'alerte, timeout (1m à 7j), rôles exemptés et salons exemptés.
- **Synchronisation API réelle** : Branché sur `GET/POST/PUT/DELETE /automod-native` et bouton 1-clic d'installation recommandée (`POST /automod-native/recommended`).

### Bouclier Owner en cascade & Refonte visuelle (v1.74.13)
- **Bascule maître en cascade intégrale** : Décocher l'interrupteur maître coupe immédiatement l'intégralité des 12 sous-protections (débannissement, timeout, rôles, vocal, pseudo, défense) à la fois dans l'interface et sur le serveur, garantissant qu'aucun voyant vert ne reste allumé quand le bouclier est inactif.
- **Refonte Motion Design & Glassmorphism** : Carte d'état en verre dépoli avec aura réactive, séparation en 4 modules thématiques (`Sanctions & Bannissements`, `Rôles & Identité`, `Salons Vocaux`, `Défense d'Etho & Confidentialité`), grille responsive des serveurs et journal d'interceptions.

### Refonte intégrale de la Messagerie / Mail (v1.74.4 → v1.74.13)
- **Fond synchronisé avec le thème utilisateur (v1.74.10)** : Élimination du blanc éblouissant, le fond des e-mails adopte la couleur exacte du thème sélectionné (Obsidian, Midnight, Dyno Rose, Arctic, etc.).
- **Rendu sandboxé isolé sans vide (v1.74.4, v1.74.9)** : Composant `MailBodyViewer` en iframe sandboxée sécurisée, 100% largeur/hauteur, sans marge morte ni coupure. Bouton d'agrandissement plein écran (`Maximize2`/`Minimize2`).
- **Images externes & CID fiabilisées (v1.74.9)** : Prise en charge `referrerpolicy="no-referrer"` anti-blocage hotlink, résolution des pièces jointes `cid:...`, surclassement HTTPS automatique.
- **Réponses rapides 1-clic & Saisie fluide (v1.74.6, v1.74.13)** : Pastilles de réponses automatiques, zone de texte auto-extensible, conteneur `shrink-0` à défilement autonome (`max-h-[45vh] overflow-y-auto`) avec marge basse protectrice empêchant tout masquage des boutons d'envoi.
- **Auto-masquage du Dock sur /mail (v1.74.13)** : Le dock flottant s'escamote automatiquement sur la page messagerie pour libérer tout l'espace d'écriture, avec bouton de rappel sur la barre d'état.

### Sélecteur de serveurs Discord en grille 3 colonnes (v1.74.12)
- Remplacement de la liste étirée sur 1 colonne par une grille responsive en 3 colonnes (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
- En-tête personnalisé avec avatar circulaire de l'utilisateur et salutation (`Bienvenue, [Nom]`).
- Cartes épurées pour serveurs gérés (badge émeraude « Bot installé », couronne propriétaire 👑) et serveurs à inviter (« Inviter le bot ↗ »).

### Audio & Confort acoustique (v1.74.11)
- Suppression complète de l'écouteur `mouseover` dans `SoundProvider` (`sound.tsx`) qui déclenchait un son systématique au survol de chaque bouton ou lien interactif.
- Maintien du retour haptique sonore au clic (`onClick`) et sur les confirmations/alertes.

### Dock flottant, Ambiance & Ergonomie (v1.74.2 → v1.74.8)
- **Réglages live d'élévation & d'échelle du Dock (v1.74.8)** : Curseurs tactiles dans le Centre de contrôle permettant de régler l'altitude (40px à 120px) et la taille (75% à 130%) avec sauvegarde en direct dans Supabase (`user_settings`).
- **Égaliseur animé & Pastilles sonores (v1.74.5, v1.74.8)** : Mini-égaliseur à 4 barres animées dans la capsule sonore du dock lors de la lecture d'une ambiance, et pastilles sonores rapides dans le chronomètre Focus (`FocusTimer2026`).
- **Restauration de la barre d'état (StatusBar, v1.74.2)** : Version en direct, statut de synchro, ping et rôle, compatible avec le Mode Zen (`Ctrl+Shift+Z`).

### Modules Console avancés & Outils staff (v1.73.8 → v1.74.1)
- **Économie** : Ajustement de solde staff via `POST /economy/wallets/:userId/adjust` avec audit.
- **Formulaires** : Export 1-clic en formats CSV et JSON.
- **Starboard** : Simulateur d'envoi de test sur Discord (`POST /starboard/test`).
- **Messages épinglés & Tags** : Aperçus fidèles du rendu Discord et bouton d'envoi de test en direct.
- **Tickets** : Onglet « Résolus » avec lecteur de transcripts HTML sécurisé en iframe.
- **Sauvegardes** : Importateur de fichiers `.json` locaux vers l'API de restauration du bot.
- **Télémétrie en direct** : Vrai ping WebSocket Gateway Discord (`client.ws.ping`) et allocation mémoire V8.

### Bot Discord Etho (v1.73.6 → v1.73.7)
- **Avatar officiel** : Intégration de l'anneau pourpre éclatant dans tous les embeds (`ethone.png`, révision `r3`).
- **Message d'accueil Keeper** : 4 points clés, détection intelligente du salon privé du staff et mention de l'inviteur.

---

## Architecture console (/discord, format Keeper)
- `app/discord/page.tsx` : état `consoleView` (`settings`, `access`, `logs`, `whitelist`, `blacklist`, `members`, `commands`, `tools`, `protections`, `automod`), liens `?view=`, `?module=`, `?p=` (protection choisie).
- Kit commun : `components/discord/console/kit.tsx`. Icônes console = `lucide-react`.
- Modules natifs (`components/discord/console/modules/*`, table `NATIVE` de `ModuleEmbed.tsx`) : AutoMod Discord (v1.74.14), Économie, Jeux, Niveaux, Giveaways, Musique, Tickets, Bienvenue, Modération, Suggestions, Rôles, Invitations, Sondages, Formulaires, Vocal, Starboard, AFK, Anniversaires, Tags, Rappels, Compteur, Messages épinglés, Salons compteurs, Highlights, Statistiques, Rôles de stats, Rôles sécurisés, Événements, Alertes streamers, Sauvegardes, Serveur, IA, Commandes personnalisées, Analytics.
- Seuls `overview` (redirigé vers l'accueil console) et `bot` (panneau global réservé au propriétaire du bot) restent dans `PAGES`.

---

## Protections & AutoMod
- Bot : `discord-bot/src/modules/protections/` (45 protections modulaires) et `discord-bot/src/modules/nativeAutomod/` (AutoMod natif Discord).
- Schéma de validation Zod complet : quotas respectés (6 règles mots-clés, 1 liste prédéfinie, 1 spam de mentions, 1 spam suspect, 1 profil de membre).
- Tolérance zéro envers les règles supprimées par des bots tiers (`confirmRuleKept`).
- Intégration complète Dashboard ↔ Discord API Gateway.

---

## État des tests & Qualité au 2026-10-15
- Tests unitaires Next.js : **385/385 passent** (57 suites).
- Lint : **0 erreur, 138 avertissements** (surtout `<img>` dans les trackers et variables inutilisées).
- TypeScript : **0 erreur** (`npx tsc --noEmit -p .`), vérifié aussi par `npm run build` (plus de `ignoreBuildErrors`).
- Audits de sécurité : `audit-security.mjs` et `precommit-upload-check.mjs` à lancer depuis la racine avant chaque commit.

---

## Reste à faire / Prochaines étapes
1. **Tests réels sur Discord avec le bot** :
   - Tester l'activation/désactivation en direct d'une règle AutoMod depuis le dashboard et constater la prise d'effet immédiate dans `Paramètres du serveur > AutoMod` sur Discord.
   - Tester le simulateur de test avec de nouvelles expressions régulières complexes.
2. **Vérification mobile des pages de la console** :
   - Contrôler sur petits écrans (< 390px) que le menu d'onglets mobiles de la console (`MobileTabs`) affiche lisiblement tous les blocs sans débordement horizontal.
3. **Optimisation des balises `<img>` restantes** :
   - Avertissements du linter sur des balises `<img>` dans les trackers de jeux (LoL, Valorant) : les migrer vers `ClientImage` ou `next/image`.
4. **Ancien dashboard Vite `discord-bot/web`** :
   - Jamais buildé ni servi sur le VPS (pas de `web/dist`), remplacé par ethone-next. Il garde une alerte `braces` sans correctif (via tailwind 3) : à supprimer avec le bloc `webDistPath` de `discord-bot/src/server/index.ts`.
5. **Surveillance & Maintenance VPS** :
   - Vérifier périodiquement l'état du bot via `pm2 logs ethone-bot` et les sauvegardes automatiques dans Supabase `bot-backups`.
