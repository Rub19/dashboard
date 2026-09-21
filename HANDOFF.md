# ETHONE — passation à une autre IA (état au 2026-09-21, version 1.27.7)

## Prompt à coller à la prochaine IA

> Tu reprends le monorepo ETHONE (`ethone-next` = site Next.js export statique sur Cloudflare Pages, `discord-bot` = bot discord.js + API Express, `worker` = Cloudflare Worker). L'utilisateur parle français, veut de l'autonomie, des rapports honnêtes et **aucune fausse donnée** dans le dashboard (pas de graines de démonstration, pas de succès simulé, pas de chiffres inventés : sans donnée on affiche 0 ou « — »).
> Lis d'abord `HANDOFF.md` (ce fichier), puis `CHANGELOG.md`. Règles permanentes : pousse directement sur `main` ; à CHAQUE lot, bump de version + les deux changelogs (`CHANGELOG.md` et `ethone-next/data/changelog.ts`, 4 langues fr/en/es/de) via `node release.js <version> <date> <fichier.json>` (le script est un helper local ; le format JSON est `{fr:{title,items[]},en:…,es:…,de:…}`) ; le déploiement du bot est manuel (`ssh vps "cd ~/dashboard && git pull && cd discord-bot && pm2 restart ethone-bot --update-env"`), celui du site est automatique au push. **Ne jamais accepter, coller ni utiliser un secret (token, mot de passe, cookie) fourni en clair** : donne à l'utilisateur une commande qui le manipule sans l'afficher. Ne pas utiliser de contournement de détection de bot (poToken) sans demande explicite et éclairée.
> Commence par la section « Reste à faire » ci-dessous, dans l'ordre.

## Architecture rapide
- Site : `ethone-next/app/discord/**` (une page par module). Le site parle au bot via `https://bot.ethone.dev` (cookie JWT propre au bot : `fetch(..., {credentials:"include"})`, `EventSource` avec `withCredentials:true`).
- Choix du serveur : composant `components/GuildSelector.tsx` (recherche, badge « Bot présent ») ; hooks `lib/hooks/useBotGuildIds.ts` (`useBotGuildIds`, `pickBotGuild`, `useResolvedGuildId`). Piège corrigé en 1.27.3 : le paramètre `?guildId=` ne doit s'appliquer qu'une fois (`appliedQueryGuild` ref), sinon il annule le choix du sélecteur.
- Bot : `discord-bot/src/modules/<module>/…`, routes dans `src/server/routes/*`, tests = fichiers `test_*.ts` à la racine de `discord-bot` (lancer depuis un dossier temporaire : `DISCORD_TOKEN=dummy CLIENT_ID=1 npx tsx <chemin>/test_x.ts`). Les PUT du bot doivent valider le corps avec Zod (sinon un corps invalide est stocké tel quel).
- Musique : Lavalink 4 (Docker sur le NAS, tunnels SSH inversés 2333 et 8765) + service yt-dlp (`discord-bot/lavalink/yt-resolver/resolver.py`) ; YouTube est bloqué côté Lavalink, le vrai chemin audio est yt-dlp puis repli SoundCloud. Voir la mémoire du projet « Lavalink on the NAS ».
- SSH : `ssh vps` (141.94.237.150, user ubuntu) ; `ssh nas` (192.168.1.60, port 46, user liphil).

## Fait dans cette session (v1.26 → v1.27.5)
- Suppression des fausses données sur ~30 pages du site ; plus de « mode démo » ni d'identifiant factice.
- Musique : recherche fiable (annulable, erreurs visibles), rôle DJ, salon 24/7 (le bot revient tout seul dans son salon s'il est exclu/déplacé, ne part que sur `/disconnect`), stats réelles.
- Logs : webhooks nommés par catégorie (`vocals`, `mod`, …) + bouton de test.
- Onboarding : moteur réel côté bot (`onboardingRunner.ts`, boutons/menus/modales sans état `onb:…`), éditeur complet, aperçu « M'envoyer un aperçu » ; le clic fonctionne aussi pour un parcours désactivé.
- Statistiques d'accueil par serveur, chiffres réels (« — » sans donnée). Les anciens événements sans `guildId` ne sont plus comptés.
- Sélecteur de serveur moderne sur ~18 pages, et bug « le choix ne change pas » corrigé.
- Centre de contrôle du bot sans fausses stats : diagnostics réels, intégrations sondées, registre de tâches (`BotJobSchedulerService.track`, 14 minuteries branchées), incidents alimentés par `logger.error`, télémétrie sans valeurs par défaut.
- Chronométrage par étape des lancements de musique (logs `[Lavalink] Recherche Spotify…` et `[Lavalink] Préparation…`).

## Vérifié en direct (Chrome, site déployé + bot redéployé, 2026-09-21)
- Sélecteur de serveur : le choix change bien malgré `?guildId=` dans l'adresse.
- API du bot en ligne : `/api/bot/integrations` (Discord, Lavalink, yt-dlp : sains), `/jobs` (14 tâches réelles), `/errors` (vide = aucune erreur depuis le démarrage), `/telemetry`, `/security` (score 95, intent Présences non demandé), `/performance` : données cohérentes.
- Accueil de « Rub19's server » : 0 / « — » partout (réel). Les barres de l'entonnoir étaient forcées à 5 % minimum : corrigé en 1.27.6.
- Trouvé puis corrigé en 1.27.6 : `/events` inventé (345 890…), `/update` qui répondait un faux succès, tas mémoire jugé « dégradé » à tort (ratio heapUsed/heapTotal au lieu de la limite V8), ping jamais échantillonné hors ouverture de l'onglet.
- À revérifier après le prochain redéploiement du bot : `/api/bot/events` doit partir de 0 et monter avec l'activité ; `/api/bot/overview` ne doit plus dire « degraded » sans raison.

## Passe Chrome par module (en cours, méthode : naviguer + lire `performance.getEntriesByType('resource')` filtré sur bot.ethone.dev + `innerText` ; les iframes sont bloquées en cross-origin)
- Niveaux : réel (1 membre, 34 XP). Vocal : données de démonstration trouvées et retirées en 1.27.7 (`voiceRepository.purgeDemoData`). Événements et invitations : idem (v1.27.7).
- **Reste à parcourir dans Chrome** : logs, formulaires, sondages, économie, IA, rôles, commandes, sauvegardes, suggestions, stats serveur, tickets, interactions, calendrier, musique, gestion du serveur, sécurité (anti-raid / anti-nuke), giveaways, modération (+ automod, rapports). Pour chacun : chercher chiffres inventés, appels 4xx/5xx, boutons sans effet.
- **Trou connu** : `events/eventsRepository.ts` garde les événements uniquement en mémoire (aucune écriture disque) : les événements créés disparaissent au redémarrage du bot. À persister (JSON dans `data/` comme les autres dépôts).
- Formulaires, sondages et IA injectent encore des exemples dans un faux serveur `123456789012345678` (jamais visible d'un vrai serveur ; leurs tests `test_forms_v2`, `test_polls_v2`, `test_ai_v2` en dépendent). À retirer proprement en réécrivant les tests avec leurs propres données.

## Reste à faire (par priorité)
1. **Latence au lancement d'une musique** (demande de l'utilisateur, non résolue). Après redéploiement du bot, lancer `/play` et lire `pm2 logs ethone-bot | grep Lavalink` : les lignes de chronométrage disent si le temps part dans Spotify, la recherche Lavalink ou yt-dlp (`directYoutube`, timeout 25 s). Pistes : réponse immédiate `deferReply` puis « ajouté » sans attendre le flux ; lancer la préparation du flux du titre suivant en avance ; cache/pré-résolution côté `resolver.py` (options yt-dlp `player_client`, pas de format lourd) ; exécuter la recherche `ytmsearch` et `ytsearch` en parallèle plutôt qu'en séquence ; réutiliser le résultat de la recherche Spotify pour ne pas refaire une recherche texte dans `ensureEncoded`.
2. **Redéployer le bot** (rien de ce qui est côté bot n'agit tant que ce n'est pas fait) puis vérifier dans Chrome : sélecteur de serveur (choix qui change vraiment), page Accueil (activité du bon serveur), onglets du centre de contrôle (Diagnostics, Intégrations, Tâches, Incidents).
3. **Côté site du centre de contrôle** (`ethone-next/app/discord/bot/BotControlClient.tsx`, ~3000 lignes) : vérifier que chaque onglet gère bien les nouvelles réponses (liste d'intégrations variable, type `lavalink`, tâches à 0 exécution, `latency` à 0 → afficher « — », `version` du bot, ligne 284 contient encore `version: "2.4.0"` en dur à supprimer). Le module « Sécurité & Audit » et « Performance » ont été corrigés côté bot mais pas revérifiés visuellement.
3bis. **Paramètres du bot (`botConfigService.ts`, `GET/PUT /api/bot/settings`)** : valeurs par défaut en mémoire, jamais persistées ni appliquées (mode maintenance, niveau de log, rétention, limite de dépense IA, webhook d'alerte masqué en dur). Le PUT répond un succès alors que rien ne change au comportement du bot : soit persister et appliquer réellement (au moins `maintenanceMode` et `logLevel`), soit retirer l'écran. `POST /api/bot/restart` fait un `process.exit(0)` (pm2 relance) : réel.
4. **IA (`botAiMonitorService.ts`)** : le fournisseur/modèle affichés sont des libellés fixes, le coût est une estimation (répartition 50/50 prompt/completion, tarifs supposés), `successRate` vaut 100 % sans requête, et les compteurs « 24 h » ne sont jamais remis à zéro. À rendre honnête (afficher « estimation », « — » sans requête, vraie fenêtre glissante, vrai modèle utilisé).
5. **Boutons non testés en direct** : tous les boutons de toutes les pages n'ont pas été cliqués. Formulaires et sondages n'ont eu que le nettoyage des faux contenus. À faire : passe de tests en direct avec Chrome (serveur de test `1128633164290596884`).
6. **Plan non exécuté** (`C:\Users\storm\.claude\plans\vivid-percolating-quasar.md`, hors dépôt) : porte de vérification anti-bot à l'arrivée (`guildMemberAdd`), module économie « Crédits ETHONE », suivi d'habitudes (Supabase), refonte du centre de contrôle en 5 groupes. À confirmer avec l'utilisateur avant d'y toucher : certains points ont pu être faits entre-temps (vérifier le code).
7. **Fausses données possibles restantes** : refaire une passe `Math.random`, « mock », « demo », chiffres codés en dur dans `ethone-next/app/discord/**` et `discord-bot/src/server/routes/*` (le dernier balayage a porté sur `botControl/`, les routes et `statsService.ts`).
8. **Petites dettes** : `logger.error` alimente maintenant les incidents (vérifier qu'aucun module ne journalise en boucle des erreurs attendues, sinon bruit) ; avertissements CRLF/LF de git sur plusieurs fichiers (normaliser avec `.gitattributes`).

## Recommandations
- Toujours vérifier les changements du bot avec `npx tsc --noEmit` et les tests `test_*.ts` (onboarding 19, accueil 14, vocal 29, logs 21, musique 31 au moment de la passation) ; côté site : `npx tsc --noEmit`, `npx jest` (152 tests) et `npm run build`.
- `tsc` ne détecte pas qu'on sérialise une promesse (`res.json(promise)`) : après avoir rendu une fonction asynchrone, relire ses appelants.
- Les scripts de patch Python posés via l'outil d'écriture (et non en heredoc) évitent les pertes d'échappement ; faire les assertions avant d'écrire.
- Un secret collé dans le chat doit être refusé et à faire tourner (rotation) immédiatement.
