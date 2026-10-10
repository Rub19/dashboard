# ETHONE — passation (2026-10-10, version 1.66.1)

## Projet
- `ethone-next/` : site Next.js statique (ethone.dev, Cloudflare Pages, déploiement auto au push sur `main`).
- `discord-bot/` : bot Etho (VPS `ssh vps`, pm2 `ethone-bot`, dossier `~/dashboard`).
- `worker/` : Cloudflare Worker `raspy-fog-bf5b` (`npx wrangler deploy` depuis `worker/`, tests `node --test test/*.test.mjs`).
- Supabase : projet `bvgifyzhpzkbrwdjrqsg` (tables mail = `ethone_mail_*`).

## Règles à respecter
- Commits : `git -c user.name="Rub19" -c user.email="rub19.mailpro@gmail.com" commit …`, message « Migration Next.js : vX - … », **sans co-auteur IA**.
- Ne jamais committer `discord-bot/scripts/etho-avatar-animated.gif` ni `.mcp.json`.
- Pas de données inventées ni de placeholders dans le dashboard. Seuls les réglages que le bot applique vraiment sont affichés.
- Refuser les secrets collés dans le chat ; ne jamais taper d'identifiants sur un site.
- Pendant les tests, ne pas modifier les vrais réglages du serveur de l'utilisateur (pas de toggles, owners, whitelist, blacklist). Keeper (keeper.jgl-bot.fr) se consulte en lecture seule.
- Déploiements autorisés (« je te laisse tout faire ») : les annoncer ; sauvegarder les données du bot avant chaque déploiement bot.
- Rapports finaux en français.

## Commandes utiles
- Release site : `cd ethone-next && node scripts/release.js <ver> <date> <json>` (JSON `{fr,en,es,de:{title,items[]}}`), puis `npm install --package-lock-only`, mettre à jour `VERSION_LABEL` dans `components/UserProfileDropdown.tsx` et la 1re ligne de ce fichier. Vérifs : `npm run lint`, `npm run test:unit`, `npm run build`, `node scripts/audit-security.mjs` et `node ./scripts/precommit-upload-check.mjs` (depuis la racine).
- Attendre le site : `until curl -s https://ethone.dev/version.json | grep -qF <ver>; do sleep 10; done`
- Déploiement bot :
  `ssh vps 'cp -r ~/dashboard/discord-bot/data ~/backups/data-$(date +%Y%m%d-%H%M) && cd ~/dashboard && git checkout -- discord-bot/package-lock.json; git pull -q origin main && pm2 restart ethone-bot >/dev/null && sleep 25 && pm2 logs ethone-bot --lines 60 --nostream 2>&1 | grep -iE "Connecté avec succès" | tail -1'`
- Tests bot : `DISCORD_TOKEN=ci-placeholder-token CLIENT_ID=000000000000000000 npx tsx tests/<fichier>.ts` ; typecheck `npx tsc --noEmit -p .`.

## Architecture console (/discord, format Keeper)
- `app/discord/page.tsx` : état `consoleView` (settings, access, logs, whitelist, blacklist, members, commands, tools, protections), liens `?view=`, `?module=`, `?p=` (protection choisie).
- Kit commun : `components/discord/console/kit.tsx`. Icônes console = `lucide-react`.
- Modules natifs (`components/discord/console/modules/*`, table `NATIVE` de `ModuleEmbed.tsx`) : Économie, Jeux, Niveaux, Giveaways, Musique, Tickets, Bienvenue, Modération, Suggestions, Rôles, Invitations, Sondages, Formulaires, Vocal, Starboard (1.58.0), AFK, Anniversaires, Tags, Rappels, Compteur, Messages épinglés, Salons compteurs, Highlights (1.59.0), Statistiques, Rôles de stats, Rôles sécurisés, Événements (1.60.0), Alertes streamers, Sauvegardes (1.61.0), Serveur, IA (1.62.0), Commandes personnalisées, Analytics, AutoMod Discord, Calendrier (vue de Événements) (1.63.0). Seuls `overview` (redirigé vers l'accueil console) et `bot` (panneau global réservé au propriétaire du bot) restent dans `PAGES`. Le module « logs » ouvre `ConsoleLogs` sur l'onglet Journal. Le module « settings » affiche `ConsoleSettings` (paramètres du bot fusionnés dans Réglages). Hook `useMemberNames` du kit pour afficher les noms à partir d'ID. Les autres modules sont encore l'ancienne page dans `.console-embed`.

## Protections (livré dans la 1.57.0, à vérifier en vrai)
- Bot : `discord-bot/src/modules/protections/`
  - `catalog.ts` : les 45 protections (clés, catégories, défauts, phrase `describeProtection`), `RECOMMENDED_PROTECTIONS`.
  - `protectionStore.ts` : réglages par serveur dans `data/protections.json` (schéma zod borné). Au 1er démarrage, reprise de l'ancien anti-nuke et des volets anti-raid remplacés (spam, mentions, bots, comptes récents, serverNuke, massMod), puis ces volets sont coupés dans l'anti-raid. Nouveau serveur = tout désactivé.
  - `protectionEngine.ts` : détection via `GuildAuditLogEntryCreate` (seuil par auteur, réparation de toute la rafale, punition unique, verrouillage optionnel avec restauration, alertes salon/rôles/@everyone/MP propriétaire, whitelist owners Etho + globale + seuil dédié + membres/rôles/salons/catégories) ; messages (`onMessage`, `onMessageDelete` pour le ghost ping) ; arrivées (anti-alt) ; Rollback = captures périodiques via le module Sauvegardes.
  - `detectors.ts` : liens, mots interdits, emojis, pavés, doublons, arnaques, toxicité (lexique local FR/EN).
  - `automodSync.ts` : mode « AutoMod Discord » pour Anti-lien et Anti-BadWord.
  - `protectionCommand.ts` : `/protection` (liste, voir, activer, desactiver, punition, seuil, salon, deverrouiller). `/antinuke` et `antiNukeService` supprimés.
  - Routes : `src/server/routes/protectionRoutes.ts` (`GET /api/guilds/:id/protections`, `PATCH /:key`, `POST /lockdown/lift`, `POST /rollback/now`).
  - Le module « anti-nuke » du registre s'appelle maintenant « Protections » (allumé = au moins une protection active).
  - La configuration assistée (`protectionSetupService.ts`) active ces protections.
  - Tests : `tests/test_protections_v1.ts`, `tests/test_protection_setup_v1.ts`, `tests/test_modules_passive_v1.ts`.
- Site : `components/discord/console/ConsoleProtections.tsx` réécrite (liste par catégorie, filtres, recherche, détail en 4 sections). La vue d'ensemble compte via `/protections`.

## Sécurité (2026-10-09)
- Toutes les routes `/api/guilds/:guildId/*` passent par `createGuildAuthMiddleware` (propriétaire, owner Etho, admin ou « Gérer le serveur ») : un membre normal n'a accès à rien dans le dashboard.
- Casino : cagnotte refusée si casino ou économie coupé, plafond 10 000 000, ajouts journalisés ; `PATCH /games/config` validé (jackpotPool non modifiable).
- Accès : un admin Discord est en lecture seule (`readOnlyBlocked` dans `guildAuth.ts`) ; seuls propriétaire et owners Etho écrivent.
- IA : `PUT /ai/settings` et `/ai/channels` validés ; `dailyBudgetTokens` plafonné mais NON appliqué par le moteur (pas affiché). Aucune clé IA payante sur le VPS (fournisseur BUILTIN).
- Commandes personnalisées : `update` ne peut plus changer guildId/id/usageCount ; `GET /:id` vérifie le serveur. Suggestions : `router.param('id')` vérifie le serveur.
- Rôles sensibles : `utils/roleSafety.ts` (`isSensitiveRole`) bloque tout rôle avec permissions de modération/admin dans les attributions automatiques (panneau de rôles, auto-rôle, niveaux, invitations, boutique, commandes perso). Test : `tests/test_role_safety_v1.ts`.
- Événements : `updateEvent` fige id/guildId/organizer/stats. Préférences vocales : userId toujours celui de la session.
- Formulaires : le repli web (page staff-only) est remplacé par un message ; limite connue : un membre ne peut répondre que par la fenêtre Discord.
- Sauvegardes : `PUT /backups/settings` validé (rétention ≤ 30 sauvegardes / 90 jours).
- Formulaires et événements : examinateur / organisateur = `req.user`, jamais une valeur du client.
- Accès VPS depuis le PC Windows : clé `~/.ssh/id_ed25519_ethone`, alias `vps` (ubuntu@141.94.237.150).

## Reste à faire
1. **Vérifier la 1.57.0 en production** : le commit/push et le déploiement du bot n'ont peut-être pas été faits (voir `git status` et `git log`). Si besoin : lancer les vérifs, committer, pousser, déployer le bot (sauvegarde avant).
2. **Protections testées (2026-10-10)** : `tests/test_protections_scenarios_v1.ts` (11 scénarios : salon/rôle supprimés recréés, bot banni, webhook supprimé, rafale de bans annulée, lien, spam, ghost ping, anti-alt, verrouillage + levée). En vrai : Rollback OK (capture visible dans Sauvegardes). Impossible de tester depuis le compte de l'utilisateur : propriétaire du serveur et du bot toujours ignorés. Sur le serveur de test, **Keeper supprime les règles AutoMod d'Etho** (anti-AutoMod de Keeper) : Etho le signale maintenant (`confirmRuleKept`). **Test réel avec un 2e compte (Lynn, rôle Mod, 2026-10-10)** : création/suppression de salon, création/suppression de rôle, webhook, lien, spam → tous réparés en 0–2 s par Etho (journal d'audit), sanction « derank » appliquée. Keeper a été retiré du serveur de test ; le rôle « Ethone Bot » doit être tout en haut. 2e série : @everyone supprimé, ghost ping signalé dans le salon, renommage de salon annulé, verrouillage puis levée (5 rôles, permissions revenues à l'identique). Réglages des protections remis à l'identique après le test.
3. **Page Protections vérifiée dans Chrome (1.66.0)** : chargement, recherche, sélection `?p=`, « Préparer les réglages », aucune erreur console ; mobile vérifié dans le code (liste max-h-80 au-dessus du détail).
4. Points connus à améliorer :
   - Anti-réorganisation : Discord ne journalise pas l'auteur → remise en place sans sanction.
   - Anti-toxicité : lexique local simple (pas d'IA) ; anti-token grab : texte et liens seulement (pas d'analyse d'image).
   - Fait en 1.66.0 : l'onglet Incidents de Logs fusionne `/security/incidents` (incidents `PROTECTION`) ; compteur « Protections X/45 » dans le HubSidebar (événement `etho:protections-changed`) ; Whitelist : la liste « anti-nuke » du bot (celle que lisent les protections) s'affiche « Protections ».
   - Ménage possible : les anciennes pages `app/discord/*` remplacées par la console ne sont plus liées.
5. **Mail** : corrigé le 2026-10-09 (liste > 64 Ko = 502 ; objets =?UTF-8?…?= décodés via postal-mime). La redirection marche ; le mail reçu le 2026-10-09 à 11:40 est bien dans la boîte ETHONE (non lu) et copié sur Gmail. Si l'utilisateur ne le voit pas dans ETHONE, regarder le rafraîchissement de la liste et les notifications temps réel de `app/mail/page.tsx`.
6. **Modules** : tous au format Keeper (1.63.0). Éditeurs avancés aussi dans la console (1.64.0-1.65.0) : restauration guidée, AutoMod Discord, commandes personnalisées (`CustomCommandEditor.tsx`), formulaires (`FormEditor.tsx`, 5 questions texte max = fenêtre Discord), sondages avancés (`AdvancedPollForm.tsx`), participants d'événements (`EventDetails.tsx`). Les anciennes pages existent encore mais ne sont plus liées.
7. Commandes : `/help` est à jour (catégorie Sécurité = `/protection`, `/antiraid`, `/automod`, `/verification`, `/logs`). Les réponses en texte brut de `/games` et `/bienvenue` sont passées en embeds ; `/tag` reste en texte (contenu du tag).
