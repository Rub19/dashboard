# ETHONE — passation (2026-10-09, version 1.59.2)

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
- Modules natifs (`components/discord/console/modules/*`, table `NATIVE` de `ModuleEmbed.tsx`) : Économie, Jeux, Niveaux, Giveaways, Musique, Tickets, Bienvenue, Modération, Suggestions, Rôles, Invitations, Sondages, Formulaires, Vocal, Starboard (1.58.0), AFK, Anniversaires, Tags, Rappels, Compteur, Messages épinglés, Salons compteurs, Highlights (1.59.0). Hook `useMemberNames` du kit pour afficher les noms à partir d'ID. Les autres modules sont encore l'ancienne page dans `.console-embed`.

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

## Reste à faire
1. **Vérifier la 1.57.0 en production** : le commit/push et le déploiement du bot n'ont peut-être pas été faits (voir `git status` et `git log`). Si besoin : lancer les vérifs, committer, pousser, déployer le bot (sauvegarde avant).
2. **Tester les protections sur Discord** avec un serveur de test (pas le serveur principal) : anti-ban (débannissement de la rafale), suppression de salon/rôle (recréation), anti-bot, anti-webhook, anti-spam, anti-lien, ghost ping, anti-alt, verrouillage puis levée, mode AutoMod (règle créée/supprimée), Rollback (capture visible dans Sauvegardes).
3. **Vérifier la page Protections dans Chrome** (lecture seule) : chargement, filtres, recherche, sélection `?p=`, « Préparer les réglages », animations, affichage mobile.
4. Points connus à améliorer :
   - Anti-réorganisation : Discord ne journalise pas l'auteur → remise en place sans sanction.
   - Anti-toxicité : lexique local simple (pas d'IA) ; anti-token grab : texte et liens seulement (pas d'analyse d'image).
   - La page « Logs de protection » de la console doit afficher les incidents de type `PROTECTION` (vérifier le libellé).
   - Le HubSidebar pourrait afficher le compteur « Protections X/45 » comme Keeper.
   - La page Whitelist parle encore de « anti-raid / anti-nuke » : à aligner sur les protections.
5. **Mail** : corrigé le 2026-10-09 (liste > 64 Ko = 502 ; objets =?UTF-8?…?= décodés via postal-mime). La redirection marche ; le mail reçu le 2026-10-09 à 11:40 est bien dans la boîte ETHONE (non lu) et copié sur Gmail. Si l'utilisateur ne le voit pas dans ETHONE, regarder le rafraîchissement de la liste et les notifications temps réel de `app/mail/page.tsx`.
6. **Modules encore à passer au format Keeper** dans la console : les autres de la table `PAGES` de `ModuleEmbed.tsx` (stats, statroles, secure roles, réglages, serveur, événements, streamers, calendrier, IA, backups, logs, analytics, automod natif, commandes, overview, bot).
7. Commandes : `/help` est à jour (catégorie Sécurité = `/protection`, `/antiraid`, `/automod`, `/verification`, `/logs`). Les réponses en texte brut de `/games` et `/bienvenue` sont passées en embeds ; `/tag` reste en texte (contenu du tag).
