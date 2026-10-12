# ETHONE — passation & nouveautés (2026-10-12, version 1.75.2)

## Projet
- `ethone-next/` : site Next.js statique (ethone.dev, Cloudflare Pages, déploiement auto au push sur `main`).
- `discord-bot/` : bot Etho (VPS `ssh vps`, pm2 `ethone-bot`, dossier `~/dashboard`).
- `worker/` : Cloudflare Worker `raspy-fog-bf5b` (`npx wrangler deploy` depuis `worker/`, tests `node --test test/*.test.mjs`).
- Supabase : projet `bvgifyzhpzkbrwdjrqsg` (tables mail = `ethone_mail_*`, sauvegardes `bot-backups`).

## Règles à respecter
- Commits : `git -c user.name="Rub19" -c user.email="rub19.mailpro@gmail.com" commit …`, message « Migration Next.js : vX - … » ou « Migration Next.js : description », **sans co-auteur IA**.
- Ne jamais committer `discord-bot/scripts/etho-avatar-animated.gif` ni `.mcp.json`.
- Pas de données inventées ni de placeholders dans le dashboard. Seuls les réglages que le bot applique vraiment sont affichés.
- **Politique stricte zéro commentaire** : aucun commentaire (`//`, `/*`, `///`) dans le code source créé ou modifié.
- Refuser les secrets collés dans le chat ; ne jamais taper d'identifiants sur un site.
- Pendant les tests, ne pas modifier les vrais réglages du serveur de l'utilisateur (pas de toggles, owners, whitelist, blacklist). Keeper (keeper.jgl-bot.fr) se consulte en lecture seule.
- Déploiements autorisés (« je te laisse tout faire ») : les annoncer ; sauvegarder les données du bot avant chaque déploiement bot.
- Rapports finaux en français.

## Commandes utiles
- Release site : `cd ethone-next && node scripts/release.js <ver> <date> <json>` (JSON `{fr,en,es,de:{title,items[]}}`), puis `npm install --package-lock-only`, synchroniser `public/version.json` et la 1re ligne de ce fichier. Vérifs : `npx tsc --noEmit`, `npm run lint`, `npm run test:unit`, `npm run build`, `node scripts/audit-security.mjs` et `node ./scripts/precommit-upload-check.mjs` (depuis la racine).
- Attendre le site : `until curl -s https://ethone.dev/version.json | grep -qF <ver>; do sleep 10; done`
- Déploiement bot :
  `ssh vps 'cp -r ~/dashboard/discord-bot/data ~/backups/data-$(date +%Y%m%d-%H%M) && cd ~/dashboard && git checkout -- discord-bot/package-lock.json; git pull -q origin main && pm2 restart ethone-bot >/dev/null && sleep 25 && pm2 logs ethone-bot --lines 60 --nostream 2>&1 | grep -iE "Connecté avec succès" | tail -1'`
- Tests bot : `DISCORD_TOKEN=ci-placeholder-token CLIENT_ID=000000000000000000 npx tsx tests/<fichier>.ts` ; typecheck `npx tsc --noEmit -p .`.

---

## Nouveautés majeures & Réalisations récentes (v1.73.0 → v1.75.2)

### 1. Vitrine Bot : Refonte Motion Design Format Bleed & Rétablissement de /bot (v1.75.2)
- **Rétablissement officiel de la vitrine sur `/bot`** : accessible directement sur `discord.ethone.dev/bot` et `ethone.dev/bot` avec métadonnées OpenGraph complètes et sans redirection cassée.
- **Motion design inspiré de MultiBot, Keeper Protect et Bleed bot** : esthétique sombre satinée (`#07080d`), halos cyan glacé `#92C8D2`, cartes en verre dépoli et spring transitions.
- **Ton sobre et direct sans jargon IA** : élimination complète des formulations artificielles ("console d'élite", "IA ultime") au profit d'un texte clair, direct et orienté communauté.
- **Simulateur de chat Discord interactif en direct** : 4 scénarios cliquables (Anti-Raid avec sanction 0.2s, Spotify avec vinyle tournant et vagues sonores, Suite Fun Bleed avec paroles défilantes, et Bienvenue avec rôles automatiques).
- **Grille bento interactive 6 modules** : commutateurs de sécurité ON/OFF interactifs en direct (Anti-Spam, Bouclier Owner, Anti-Nuke, Pont Spotify), cartes visuelles et exemples concrets.
- **Bandeau défilant des communautés partenaires** et compteurs réels animés (`CountUp`).
- **Prise en main en 3 étapes claires**, catalogue de commandes avec recherche, filtres et copie de syntaxe en 1 clic.
- **Section FAQ interactive** avec accordéons repliables et bannière d'invitation finale.

### 2. Catégorie Fun & Divertissement : Suite de Commandes Format Bleed & Studio Dashboard (v1.75.1)
- **Suite complète de commandes Bleed pour Etho** : 8 commandes Discord dédiées (`/lyrics`, `/quote`, `/image`, `/duckduckgoimage`, `/reverseimage`, `/tvshow`, `/movie`, `/game`) et commande d'aiguillage `/fun <subcommand>`.
- **Recherche de paroles en direct (`/lyrics`)** : Moteur LRCLib gratuit sans clé, support des requêtes artiste + titre, affichage des paroles synchronisées ou brutes, durée et pochette d'album.
- **Générateur de citations stylisées (`/quote`)** : Rendu esthétique instantané aux couleurs de Discord avec support des auteurs, texte et date.
- **Recherche visuelle & Recherche inversée (`/image`, `/duckduckgoimage`, `/reverseimage`)** : Recherche d'images haute résolution via Wikimedia Commons et génération de liens profonds directs vers Google Lens, Bing Visual Search, TinEye, Yandex et SauceNAO.
- **Bases culturelles en temps réel (`/tvshow`, `/movie`, `/game`)** : Requêtes en direct sur TVMaze (séries TV), Wikipédia REST API (films), CheapShark & Steam (jeux vidéo avec réductions, évaluations et prix).
- **Module Dashboard Fun interactif (`/discord?view=fun`)** :
  - Catalogue style Bleed : cartes sombres avec badges d'arguments et permissions `none`, bouton de copie en un clic avec animation de coche.
  - Studios interactifs en direct : onglets Paroles, Citations, Recherche d'images, Recherche inversée, Cinéma & Séries et Jeux vidéo sans aucun placeholder ni fausse donnée.
- **Zéro commentaire & zéro placeholder** : Conforme aux règles strictes du projet (0 commentaire dans le code source, données 100 % réelles).

### 2. Intégration Complète Spotify : Commandes Bot & Dashboard Interactif Motion (v1.75.0)
- **Suite de commandes Spotify pour le bot** : 20 commandes slash et préfixes (`/spotify nowplaying`, `play`, `pause`, `resume`, `next`, `previous`, `seek`, `volume`, `repeat`, `shuffle`, `queue`, `like`, `unlike`, `toptracks`, `topartists`, `device`, `devices`, `vc`, `login`, `logout`) avec raccourcis directs.
- **Pont vocal Discord (`/spotify vc`)** : diffusion directe du titre Spotify en cours d'écoute dans le salon vocal Discord du membre via le lecteur audio Etho.
- **Boutons interactifs Discord** : commandes directes depuis l'embed d'écoute avec boutons Précédent, Lecture/Pause, Suivant, Like/Unlike et Diffuser en vocal.
- **Module Dashboard Spotify immersif (`/discord?view=spotify`)** : vinyle animé en rotation Framer Motion, égaliseur sonore dynamique 5 bandes, barre de progression interactive et curseur de volume temps réel.
- **Zéro placeholder & actions réelles** : recherche et ajout à la file d'attente, transfert d'appareil actif, gestion des favoris et statistiques de morceaux et artistes préférés.

### 2. Console Discord : Résolution du blocage sur /bot et suppression de l'ancien dashboard (v1.74.18)
- **Suppression du dashboard fantôme** : Retrait définitif de `EthoProtectDashboard.tsx` qui bloquait l'affichage (« Bonjour Compte », 0 serveur et écran noir).
- **Redirection instantanée vers la console officielle** : `https://discord.ethone.dev/bot` et la racine de `discord.ethone.dev` redirigent immédiatement vers `/discord`.
- **Expérience unifiée & connectée** : Affichage direct de la session Discord sécurisée (BotSessionGate), des vrais serveurs en grille moderne à 3 colonnes et de la détection de présence.

### 2. Bouclier Owner : Défilement fluide de la page et épuration des libellés (v1.74.17)
- **Défilement restauré** : Intégration du conteneur `os-scroll` et déverrouillage de la hauteur sur `/discord/owner-shield` et `/owner/shield` permettant de faire défiler l'intégralité de la console et des serveurs surveillés sans blocage ni coupure.
- **Nettoyage des formulations artificielles** : Suppression des mentions « Console d'élite » et « inviolable » au profit de libellés sobres et professionnels (« Protection Propriétaire », « Rétablissement automatique de vos rôles »).
- **Espacement bas optimisé** : Ajout d'une marge de défilement inférieure (`pb-36`) évitant toute collision avec le bouton flottant de retour et le dock.

### 3. Bouclier Owner : Extinction en cascade des serveurs surveillés (v1.74.16)
- **Extinction synchronisée des serveurs** : Lorsque le bouclier principal est désactivé au sommet de la page, tous les commutateurs de la grille « Serveurs surveillés » basculent immédiatement en inactif (OFF, grisés).
- **Statut et filtres alignés** : Chaque carte de serveur affiche désormais « Bouclier coupé » en gris neutre, le compteur de serveurs couverts passe à `0 / [total]` et l'onglet filtre passe dynamiquement en `Inactifs ([total])`.
- **Réactivation intelligente par serveur** : Tenter d'activer la surveillance sur un serveur individuel alors que le bouclier maître est coupé réenclenche automatiquement le bouclier principal et sécurise immédiatement le serveur ciblé.

### 2. Généralisation de la vue moderne & suppression définitive de la vue classique (v1.74.15)
- **Suppression du mode classique** : Retrait complet de l'ancienne vue mono-colonne dans `ServerPicker.tsx`, des composants obsolètes (`ClassicAvatar`), des styles et classes CSS obsolètes (`rowClass`, `discordBtn`) et des branches conditionnelles de secours.
- **Vue moderne en standard unique** : La grille responsive en 3 colonnes (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) avec en-tête d'accueil personnalisé (`Bienvenue, [Nom]`), cartes compactes et statut d'installation en direct est désormais le standard unique et permanent.
- **Suppression des bascules** : Retrait du bouton `Vue classique` dans l'en-tête bureau et du bouton `Classique` sur mobile, ainsi que du commutateur `Voir l'ancienne vitrine` dans le dashboard bot.
- **Allègement du bundle** : Nettoyage de plus de 250 lignes de code mort et d'icônes obsolètes pour des performances accrues.

### 2. Discord AutoMod natif format Keeper (v1.74.14)
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

### 2. Bouclier Owner en cascade & Refonte visuelle (v1.74.13)
- **Bascule maître en cascade intégrale** : Décocher l'interrupteur maître coupe immédiatement l'intégralité des 12 sous-protections (débannissement, timeout, rôles, vocal, pseudo, défense) à la fois dans l'interface et sur le serveur, garantissant qu'aucun voyant vert ne reste allumé quand le bouclier est inactif.
- **Refonte Motion Design & Glassmorphism** : Carte d'état en verre dépoli avec aura réactive, séparation en 4 modules thématiques (`Sanctions & Bannissements`, `Rôles & Identité`, `Salons Vocaux`, `Défense d'Etho & Confidentialité`), grille responsive des serveurs et journal d'interceptions.

### 3. Refonte intégrale de la Messagerie / Mail (v1.74.4 → v1.74.13)
- **Fond synchronisé avec le thème utilisateur (v1.74.10)** : Élimination du blanc éblouissant, le fond des e-mails adopte la couleur exacte du thème sélectionné (Obsidian, Midnight, Dyno Rose, Arctic, etc.).
- **Rendu sandboxé isolé sans vide (v1.74.4, v1.74.9)** : Composant `MailBodyViewer` en iframe sandboxée sécurisée, 100% largeur/hauteur, sans marge morte ni coupure. Bouton d'agrandissement plein écran (`Maximize2`/`Minimize2`).
- **Images externes & CID fiabilisées (v1.74.9)** : Prise en charge `referrerpolicy="no-referrer"` anti-blocage hotlink, résolution des pièces jointes `cid:...`, surclassement HTTPS automatique.
- **Réponses rapides 1-clic & Saisie fluide (v1.74.6, v1.74.13)** : Pastilles de réponses automatiques, zone de texte auto-extensible, conteneur `shrink-0` à défilement autonome (`max-h-[45vh] overflow-y-auto`) avec marge basse protectrice empêchant tout masquage des boutons d'envoi.
- **Auto-masquage du Dock sur /mail (v1.74.13)** : Le dock flottant s'escamote automatiquement sur la page messagerie pour libérer tout l'espace d'écriture, avec bouton de rappel sur la barre d'état.

### 4. Sélecteur de serveurs Discord en grille 3 colonnes (v1.74.12)
- Remplacement de la liste étirée sur 1 colonne par une grille responsive en 3 colonnes (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
- En-tête personnalisé avec avatar circulaire de l'utilisateur et salutation (`Bienvenue, [Nom]`).
- Cartes épurées pour serveurs gérés (badge émeraude « Bot installé », couronne propriétaire 👑) et serveurs à inviter (« Inviter le bot ↗ »).

### 5. Audio & Confort acoustique (v1.74.11)
- Suppression complète de l'écouteur `mouseover` dans `SoundProvider` (`sound.tsx`) qui déclenchait un son systématique au survol de chaque bouton ou lien interactif.
- Maintien du retour haptique sonore au clic (`onClick`) et sur les confirmations/alertes.

### 6. Dock flottant, Ambiance & Ergonomie (v1.74.2 → v1.74.8)
- **Réglages live d'élévation & d'échelle du Dock (v1.74.8)** : Curseurs tactiles dans le Centre de contrôle permettant de régler l'altitude (40px à 120px) et la taille (75% à 130%) avec sauvegarde en direct dans Supabase (`user_settings`).
- **Égaliseur animé & Pastilles sonores (v1.74.5, v1.74.8)** : Mini-égaliseur à 4 barres animées dans la capsule sonore du dock lors de la lecture d'une ambiance, et pastilles sonores rapides dans le chronomètre Focus (`FocusTimer2026`).
- **Restauration de la barre d'état (StatusBar, v1.74.2)** : Version en direct, statut de synchro, ping et rôle, compatible avec le Mode Zen (`Ctrl+Shift+Z`).

### 7. Modules Console avancés & Outils staff (v1.73.8 → v1.74.1)
- **Économie** : Ajustement de solde staff via `POST /economy/wallets/:userId/adjust` avec audit.
- **Formulaires** : Export 1-clic en formats CSV et JSON.
- **Starboard** : Simulateur d'envoi de test sur Discord (`POST /starboard/test`).
- **Messages épinglés & Tags** : Aperçus fidèles du rendu Discord et bouton d'envoi de test en direct.
- **Tickets** : Onglet « Résolus » avec lecteur de transcripts HTML sécurisé en iframe.
- **Sauvegardes** : Importateur de fichiers `.json` locaux vers l'API de restauration du bot.
- **Télémétrie en direct** : Vrai ping WebSocket Gateway Discord (`client.ws.ping`) et allocation mémoire V8.

### 8. Bot Discord Etho (v1.73.6 → v1.73.7)
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

## État des tests & Qualité au 2026-10-12
- Tests unitaires Next.js : **329/329 tests passent**.
- TypeScript : **`npx tsc --noEmit` passe sans aucune erreur**.
- Lint : **`npm run lint` passe sans aucune erreur**.
- Audits de sécurité : `audit-security.mjs` et `precommit-upload-check.mjs` passent (0 avertissement, 1893 fichiers audités).
- Build Next.js : **Export statique 100% vert**, toutes les routes pré-rendues.
- Déploiement : commit `351e97cc` poussé sur la branche `main` (déploiement automatique Cloudflare Pages).

---

## Reste à faire / Prochaines étapes
1. **Tests réels sur Discord avec le bot** :
   - Tester l'activation/désactivation en direct d'une règle AutoMod depuis le dashboard et constater la prise d'effet immédiate dans `Paramètres du serveur > AutoMod` sur Discord.
   - Tester le simulateur de test avec de nouvelles expressions régulières complexes.
2. **Vérification mobile des pages de la console** :
   - Contrôler sur petits écrans (< 390px) que le menu d'onglets mobiles de la console (`MobileTabs`) affiche lisiblement tous les blocs sans débordement horizontal.
3. **Optimisation des balises `<img>` restantes** :
   - 22 avertissements mineurs du linter sur des balises `<img>` dans des composants trackers de jeux (LoL, Valorant) : les migrer progressivement vers `ClientImage` ou `next/image`.
4. **Surveillance & Maintenance VPS** :
   - Vérifier périodiquement l'état du bot via `pm2 logs ethone-bot` et les sauvegardes automatiques dans Supabase `bot-backups`.
